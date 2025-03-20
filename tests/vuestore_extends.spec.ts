import {assert, expect} from 'chai';
import VueStore from '../src';
import Vue, {computed, nextTick, reactive, watch} from "vue";
import {spy, SpySet} from "./test_utils";
import {testWatches} from "./shared_watches";
import {testProperties} from "./shared_properties";
import {testPrivateMembers} from "./shared_private_members";
import {testCommon} from "./shared_common";

describe("@VueStore + extends VueStore", () => {
  testCommon(VueStore, VueStore, v => v)
  testProperties(VueStore, VueStore, v => v)
  testWatches(VueStore, VueStore, v => v)

  it("methods should be accessible and reactive", async () => {
    @VueStore
    class Store extends VueStore {
      value = 10

      changeValue() {
        this.value = 100
      }
    }

    let valueSpy = spy()
    let store = new Store()
    watch(() => store.value, valueSpy)

    store.changeValue()
    await nextTick()
    expect(valueSpy).to.be.called.with(100, 10)
  });

  it("non-arrow functions should have `this` bound to the reactive instance", async () => {
    @VueStore
    class Store extends VueStore {
      value = 10
      changeValue: Function

      constructor() {
        super()
        this.changeValue = function () {
          this.value = 100
        }
      }
    }

    let valueSpy = spy()
    let store = new Store()
    watch(() => store.value, valueSpy)

    store.changeValue()
    await nextTick()
    expect(valueSpy).to.be.called.with(100, 10)
  });

  it("arrow functions in the constructor should have `this` bound to the reactive instance", async () => {
    @VueStore
    class Store extends VueStore {
      value = 10
      bump: () => void

      constructor() {
        super()
        this.bump = () => this.value++
      }
    }

    const store = new Store()
    const valueSpy = spy()
    watch(() => store.value, valueSpy)

    store.bump() // using `this` captured in the constructor

    await nextTick()
    expect(valueSpy).to.be.called.with(11, 10)
  });

  it("instanceof should return true", () => {
    @VueStore
    class Store extends VueStore {
    }

    expect(new Store()).to.be.instanceof(Store)
  });

  it("constructor name should match", () => {
    @VueStore
    class Store extends VueStore {}

    expect(Store.name).to.equal("Store")
  });

  it("statics should work", () => {
    @VueStore
    class Store extends VueStore {
      static prop = 10
      static bump() {
        this.prop += 10
      }
    }

    expect(Store.prop).to.equal(10)
    Store.bump()
    expect(Store.prop).to.equal(20)
  });

  describe("constructor", () => {
    it("mutating a property during construction shouldn't immediately invalidate the computed", async () => {
      const constructSpy = spy()

      @VueStore
      class Store extends VueStore {
        public x: number = 0

        constructor(x: number) {
          super()
          this.x = x
        }
      }

      const cachedComputed = computed(() => {
        constructSpy()
        return new Store(5)
      })

      cachedComputed.value // <- constructs first value
      cachedComputed.value // <- should be cached
      expect(constructSpy).to.be.called.once
    });

    it("accessing then mutating a property during construction will immediately invalidate the computed that constructed it", async () => {
      const constructSpy = spy()

      @VueStore
      class Store extends VueStore {
        constructor(public x: number) {
          super()
          const n = this.x
          this.x = x + 1
        }
      }

      const cachedComputed = computed(() => {
        constructSpy()
        return new Store(5)
      })

      cachedComputed.value // <- constructs first value
      cachedComputed.value // <- won't be cached
      expect(constructSpy).to.be.called.exactly(2)
    });

    it("mutating a computed property during construction shouldn't immediately invalidate the computed that constructed it", async () => {
      const constructSpy = spy()

      @VueStore
      class Store extends VueStore {
        constructor(public x: number) {
          super()

          this.foo = x + 3
        }

        get foo() {
          return this.x + 1
        }

        set foo(value) {
          this.x = value - 1
        }
      }

      const cachedComputed = computed(() => {
        constructSpy()
        return new Store(5)
      })

      cachedComputed.value // <- constructs first value
      cachedComputed.value // <- should be cached
      expect(constructSpy).to.be.called.once
    });
  });

  testPrivateMembers(VueStore, VueStore, v => v)

  describe("private members", () => {
    it("watches should have access to private fields", () => {
      let external = -1

      @VueStore
      class Store extends VueStore {
        #value = -1
        prop = 10

        'on.sync:prop'() {
          this.#value = this.prop
          external = this.#value
        }
      }

      let store = new Store()

      expect(() => store.prop = 20).not.to.throw(TypeError)
      expect(external).to.equal(20)
    });

    it("watches should have access to private methods", () => {
      const callSpy = spy()

      @VueStore
      class Store extends VueStore {
        prop = 10

        #value() {
          callSpy(this.prop)
        }

        'on.sync:prop'() {
          this.#value()
        }
      }

      let store = new Store()

      expect(() => store.prop = 20).not.to.throw(TypeError)
      expect(callSpy).to.be.called.with(20)
    });

    it("watches should have access to private properties", () => {
      const getSpy = spy()
      const setSpy = spy()

      @VueStore
      class Store extends VueStore {
        v = 10

        get #value() {
          getSpy(this.v)
          return this.v
        }

        set #value(value) {
          setSpy(this.v, value)
          this.v = value
        }

        prop = 0

        'on.sync:prop'() {
          this.#value = this.#value + this.prop
        }
      }

      let store = new Store()

      expect(() => store.prop = 20).not.to.throw(TypeError)
      expect(getSpy).to.be.called.with(10)
      expect(setSpy).to.be.called.with(10, 30)
    });
  });

  describe("inheritance", () => {
    it("watches shouldn't be duplicated when subclasses are annotated with @VueStore", async () => {
      let plainSpy = spy()

      @VueStore
      class BaseStore extends VueStore {
        plain = 10

        'on:plain'(...args) {
          plainSpy(...args)
        }
      }

      @VueStore
      class ChildStore extends BaseStore {

      }

      let store = new ChildStore()

      store.plain++

      await nextTick()

      expect(plainSpy).to.be.called.exactly(1)
    });

    it("overriding watches and getters/setters only use the override", async () => {
      let plainSpy = spy()
      let overrideSpy = spy()

      @VueStore
      class BaseStore extends VueStore {
        plain = 10

        'on:plain'(...args) {
          plainSpy(...args)
        }
      }

      @VueStore
      class ChildStore extends BaseStore {
        'on:plain'(...args) {
          overrideSpy(...args)
        }
      }

      let store = new ChildStore()

      store.plain++

      await nextTick()

      expect(plainSpy).not.to.be.called()
      expect(overrideSpy).to.be.called.exactly(1)
    });

    it("overriding a getter/setter with a get-only or set-only property should behave correctly", () => {
      const spyset = new SpySet()

      @VueStore
      class BaseStore extends VueStore {
        baseValue = 10

        get foo() {
          spyset.baseGetter(this.baseValue)
          return this.baseValue
        }

        set foo(value) {
          spyset.baseSetter(value)
          this.baseValue = value
        }
      }

      @VueStore
      class ChildStore extends BaseStore {
        childValue = 20
        get foo() {
          spyset.childGetter(this.childValue)
          return this.childValue
        }
      }

      let store = new ChildStore()

      expect(store.foo).to.equal(20)
      expect(spyset.childGetter).to.be.called.once
      expect(spyset.baseGetter).not.to.be.called()
      spyset.resetAll()

      store.baseValue++
      expect(store.foo).to.equal(20)
      expect(spyset.childGetter).not.to.be.called() // cached
      expect(spyset.baseGetter).not.to.be.called()
      spyset.resetAll()

      store.childValue++
      expect(store.foo).to.equal(21)
      expect(spyset.childGetter).to.be.called.once
      expect(spyset.baseGetter).not.to.be.called()
    });

    it("watches should only be activated after the object is fully initialized", async () => {
      let baseSpy = spy()

      @VueStore
      class BaseStore extends VueStore {
        baseValue = 10

        'on.immediate:baseValue'(...args) {
          baseSpy(...args)
        }
      }

      @VueStore
      class ChildStore extends BaseStore {
        constructor() {
          super()
          this.baseValue = 20
        }
      }

      let store = new ChildStore()

      await nextTick()

      expect(baseSpy).to.be.called.once
      expect(baseSpy).to.be.called.with(20, undefined)
    });

    it("the constructor should fail when a non-decorated class extends VueStore", () => {
      class Store extends VueStore {
      }

      expect(() => new Store()).to.throw("Class Store isn't decorated with @VueStore")
    });

    it("the constructor should fail when a non-decorated class indirectly extends VueStore", () => {
      class ParentStore extends VueStore {
      }

      class ChildStore extends ParentStore {
      }

      expect(() => new ChildStore()).to.throw("Class ChildStore isn't decorated with @VueStore")
    });

    it("the constructor should fail when a non-decorated class extends a decorated class", () => {
      @VueStore
      class ParentStore {
      }

      class ChildStore extends ParentStore {
      }

      expect(() => new ChildStore()).to.throw("Class ChildStore isn't decorated with @VueStore")
    });

    it("the constructor should succeed when a decorated class extends a class which extends VueStore", () => {
      class ParentStore extends VueStore {
      }

      @VueStore
      class ChildStore extends ParentStore {
      }

      expect(() => new ChildStore()).not.to.throw()
    });
  });

  describe("limitations", () => {
    it("watches won't be created for indirect (string) references or functions defined directly on the instance", async () => {
      let spies = {
        runtimeSpy: spy(),
        indirectSpy: spy(),
      }

      @VueStore
      class Store extends VueStore {
        runtimeValue = 10
        indirectValue = 20

        'on:runtimeValue' = function (...args) {
          spies.runtimeSpy(...args)
        }

        'on:indirectValue' = 'indirect'

        indirect(...args) {
          spies.indirectSpy(...args)
        }
      }

      let store = new Store()

      store.runtimeValue++
      store.indirectValue++

      await nextTick()

      expect(spies.runtimeSpy, 'runtimeValue').not.to.be.called()
      expect(spies.indirectSpy, 'indirectValue').not.to.be.called()
    });

    it("when not extending VueStore, methods, watches, getters, and setters won't have access to private fields", () => {
      let watchError: any = null
      @VueStore
      class Store {
        #value = -1
        prop = 10

        'on.sync:prop'() {
          try {
            this.#value = this.prop
          } catch (e) {
            watchError = e
          }
        }

        get privateValue() {
          return this.#value
        }

        set privateValue(value) {
          this.#value = value
        }

        bumpValue() {
          this.#value++
        }
      }

      let store = new Store()

      expect(() => store.privateValue).to.throw(TypeError)
      expect(() => store.privateValue = 20).to.throw(TypeError)
      expect(() => store.bumpValue()).to.throw(TypeError)
      store.prop = 20
      expect(() => {
        if(watchError) throw watchError
      }).to.throw(TypeError)
    });

    it("when not extending VueStore, methods, watches, getters, and setters won't have access to private properties", () => {
      let watchError: any = null
      @VueStore
      class Store {
        v = -1
        prop = 10

        get #value() {
          return this.v
        }
        set #value(value) {
          this.v = value
        }

        'on.sync:prop'() {
          try {
            this.#value = this.prop
          } catch (e) {
            watchError = e
          }
        }

        get privateValue() {
          return this.#value
        }

        set privateValue(value) {
          this.#value = value
        }

        bumpValue() {
          this.#value++
        }
      }

      let store = new Store()

      expect(() => store.privateValue).to.throw(TypeError)
      expect(() => store.privateValue = 20).to.throw(TypeError)
      expect(() => store.bumpValue()).to.throw(TypeError)
      store.prop = 20
      expect(() => {
        if (watchError) throw watchError
      }).to.throw(TypeError)
    });

    it("when extending a VueStore-wrapped class, the wrapped class won't have access to private fields, methods, or properties", () => {
      class Wrapped {
        v = -1
        #field = 10

        get #value() {
          return this.v
        }
        set #value(value) {
          this.v = value
        }
        #method() {

        }

        tryGetField() {
          return this.#field
        }

        trySetField() {
          this.#field = 20
        }

        tryGetProperty() {
          return this.#value
        }

        trySetProperty() {
          this.#value = 20
        }

        tryMethod() {
          this.#method()
        }
      }

      @VueStore
      class Store extends VueStore(Wrapped) {
      }

      let store = new Store()

      expect(() => store.tryGetField()).to.throw(TypeError)
      expect(() => store.trySetField()).to.throw(TypeError)
      expect(() => store.tryGetProperty()).to.throw(TypeError)
      expect(() => store.trySetProperty()).to.throw(TypeError)
      expect(() => store.tryMethod()).to.throw(TypeError)
    });
  });
});
