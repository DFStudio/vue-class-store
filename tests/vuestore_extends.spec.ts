import {assert, expect} from 'chai';
import VueStore, {createStore} from '../src';
import Vue, {computed, nextTick, reactive, watch} from "vue";
import {spy, SpySet} from "./test_utils";

describe("@VueStore + extends VueStore", () => {
  it("properties should be reactive", async () => {
    @VueStore
    class Store extends VueStore {
      plain = 10
      declared: number

      constructor() {
        super()
        this.declared = 20
        this['notDeclared'] = 30
      }
    }

    let store = new Store()
    store['late'] = 40

    const spies = new SpySet()
    watch(() => store.plain, spies.plain)
    watch(() => store.declared, spies.declared)
    watch(() => store['notDeclared'], spies.notDeclared)
    watch(() => store['late'], spies.late)

    store.plain = 100
    store.declared = 200
    store['notDeclared'] = 300
    store['late'] = 400

    await nextTick()

    expect(spies.plain).to.be.called.with(100, 10)
    expect(spies.declared).to.be.called.with(200, 20)
    expect(spies.notDeclared).to.be.called.with(300, 30)
    expect(spies.late).to.be.called.with(400, 40)
  });

  it("basic watches should work", async () => {
    let spies = {
      plainSpy: spy(),
      deepSpy: spy(),
      immediateSpy: spy(),
      syncSpy: spy(),
      unwatchedComputedSpy: spy(),
      computedGetterSpy: spy(),
      computedWatchSpy: spy(),
    }

    @VueStore
    class Store extends VueStore {
      plain = 10
      deep = {value: 20}
      immediate = 30
      computedData = 40
      sync = 50

      get computed() {
        spies.computedGetterSpy(this.computedData)
        return `${this.computedData}`
      }

      get unwatchedComputed() {
        spies.unwatchedComputedSpy(this.computedData)
        return `${this.computedData}`
      }

      'on:plain'(...args) {
        spies.plainSpy(...args)
      }

      'on.deep:deep'(...args) {
        spies.deepSpy(...args)
      }

      'on.immediate:immediate'(...args) {
        spies.immediateSpy(...args)
      }

      'on:computed'(...args) {
        spies.computedWatchSpy(...args)
      }

      'on.sync:sync'(...args) {
        spies.syncSpy(...args)
      }
    }

    let store = new Store()

    expect(spies.immediateSpy).to.be.called.with(30)
    expect(spies.computedGetterSpy, 'watched getter initial value computed').to.be.called.with(40)
    expect(spies.unwatchedComputedSpy, 'unwatched getter never accessed').not.to.be.called()

    store.plain++
    store.deep.value++
    store.immediate++
    store.computedData++

    await nextTick()

    expect(spies.plainSpy, 'plain').to.be.called.with(11, 10)
    expect(spies.deepSpy, 'deep').to.be.called.with(store.deep, store.deep)
    expect(spies.immediateSpy, 'immediate').to.be.called.with(31, 30)
    expect(spies.computedGetterSpy, 'computed getter').to.be.called.with(41)
    expect(spies.computedWatchSpy, 'computed watcher').to.be.called.with('41', '40')

    // no need for nextTick
    store.sync++
    expect(spies.syncSpy, 'sync').to.be.called.with(51, 50)
    store.sync++
    expect(spies.syncSpy, 'sync').to.be.called.with(52, 51)
  });

  it("nested watches should work", async () => {
    let spies = {
      plainSpy: spy(),
      deepSpy: spy(),
      immediateSpy: spy(),
      syncSpy: spy(),
      unwatchedComputedSpy: spy(),
      computedGetterSpy: spy(),
      computedWatchSpy: spy(),
    }

    @VueStore
    class Store extends VueStore {
      plain = 10
      deep = {value: 20}
      immediate = 30
      computedData = 40
      sync = 50

      get computed() {
        spies.computedGetterSpy(this.computedData)
        return `${this.computedData}`
      }

      get unwatchedComputed() {
        spies.unwatchedComputedSpy(this.computedData)
        return `${this.computedData}`
      }

      'on:plain'(...args) {
        spies.plainSpy(...args)
      }

      'on.deep:deep'(...args) {
        spies.deepSpy(...args)
      }

      'on.immediate:immediate'(...args) {
        spies.immediateSpy(...args)
      }

      'on:computed'(...args) {
        spies.computedWatchSpy(...args)
      }

      'on.sync:sync'(...args) {
        spies.syncSpy(...args)
      }
    }

    let store = new Store()

    expect(spies.immediateSpy).to.be.called.with(30)
    expect(spies.computedGetterSpy, 'watched getter initial value computed').to.be.called.with(40)
    expect(spies.unwatchedComputedSpy, 'unwatched getter never accessed').not.to.be.called()

    store.plain++
    store.deep.value++
    store.immediate++
    store.computedData++

    await nextTick()

    expect(spies.plainSpy, 'plain').to.be.called.with(11, 10)
    expect(spies.deepSpy, 'deep').to.be.called.with(store.deep, store.deep)
    expect(spies.immediateSpy, 'immediate').to.be.called.with(31, 30)
    expect(spies.computedGetterSpy, 'computed getter').to.be.called.with(41)
    expect(spies.computedWatchSpy, 'computed watcher').to.be.called.with('41', '40')

    // no need for nextTick
    store.sync++
    expect(spies.syncSpy, 'sync').to.be.called.with(51, 50)
    store.sync++
    expect(spies.syncSpy, 'sync').to.be.called.with(52, 51)
  });

  it("nested watches should correctly handle null and undefined intermediary values", async () => {
    let spies = new SpySet()

    @VueStore
    class Store extends VueStore {
      undefinedRoot: any = {chain: {value: 20}}
      undefinedChain: any = {chain: {value: 20}}
      undefinedLeaf: any = {chain: {value: 20}}
      nullRoot: any = {chain: {value: 20}}
      nullChain: any = {chain: {value: 20}}
      nullLeaf: any = {chain: {value: 20}}

      'on:undefinedRoot.chain.value'(...args) {
        spies['undefinedRoot.chain.value'](...args)
      }

      'on:undefinedChain.chain.value'(...args) {
        spies['undefinedChain.chain.value'](...args)
      }

      'on:undefinedLeaf.chain.value'(...args) {
        spies['undefinedLeaf.chain.value'](...args)
      }

      'on:nullRoot.chain.value'(...args) {
        spies['nullRoot.chain.value'](...args)
      }

      'on:nullChain.chain.value'(...args) {
        spies['nullChain.chain.value'](...args)
      }

      'on:nullLeaf.chain.value'(...args) {
        spies['nullLeaf.chain.value'](...args)
      }
    }

    let store = new Store()

    store.undefinedRoot = undefined
    store.undefinedChain.chain = undefined
    store.undefinedLeaf.chain.value = undefined
    store.nullRoot = null
    store.nullChain.chain = null
    store.nullLeaf.chain.value = null

    await nextTick()

    expect(spies['undefinedRoot.chain.value'], 'undefinedRoot.chain.value').to.be.called.with(undefined, 20)
    expect(spies['undefinedChain.chain.value'], 'undefinedChain.chain.value').to.be.called.with(undefined, 20)
    expect(spies['undefinedLeaf.chain.value'], 'undefinedLeaf.chain.value').to.be.called.with(undefined, 20)
    expect(spies['nullRoot.chain.value'], 'nullRoot.chain.value').to.be.called.with(undefined, 20)
    expect(spies['nullChain.chain.value'], 'nullChain.chain.value').to.be.called.with(undefined, 20)
    // leaf value is literal null
    expect(spies['nullLeaf.chain.value'], 'nullLeaf.chain.value').to.be.called.with(null, 20)
  });

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

  describe("private members", () => {

    describe("private fields", () => {
      it("methods should have access to private fields", () => {
        let external = -1

        @VueStore
        class Store extends VueStore {
          #value = 10

          bumpValue() {
            this.#value++
            external = this.#value
          }
        }

        let store = new Store()

        expect(() => store.bumpValue()).not.to.throw()
        expect(external).to.equal(11)
      });

      it("getters and setters should have access to private fields", () => {
        @VueStore
        class Store extends VueStore {
          #value = 10
          updateComputed = 1

          get privateValue() {
            const x = this.updateComputed
            return this.#value
          }

          set privateValue(value) {
            this.#value = value
          }
        }

        let store = new Store()

        expect(() => store.privateValue).not.to.throw()
        expect(store.privateValue).to.equal(10)
        expect(() => store.privateValue = 20).not.to.throw()

        expect(store.privateValue).to.equal(10)
        store.updateComputed++ // private fields aren't reactive
        expect(store.privateValue).to.equal(20)
      });

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
    });

    describe("private methods", () => {
      it("methods should have access to private methods", () => {
        const callSpy = spy()

        @VueStore
        class Store extends VueStore {
          v = 10

          #value(...args) {
            callSpy(...args)
            return this.v * 2
          }

          getValue() {
            return this.#value()
          }
        }

        let store = new Store()

        expect(() => store.getValue()).not.to.throw()
        expect(store.getValue()).to.equal(20)
        expect(callSpy).to.be.called()
      });

      it("getters and setters should have access to private methods", () => {
        const callSpy = spy()

        @VueStore
        class Store extends VueStore {
          v = 10

          #value(...args) {
            callSpy(...args)
            return this.v * 2
          }

          get privateValue() {
            return this.#value()
          }

          set privateValue(value) {
            this.#value(value)
          }
        }

        let store = new Store()

        expect(() => store.privateValue).not.to.throw()
        expect(callSpy).to.be.called()
        expect(store.privateValue).to.equal(20)
        callSpy.reset()
        expect(() => store.privateValue = 40).not.to.throw()
        expect(callSpy).to.be.called.with(40)
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

    });

    describe("private properties", () => {
      it("methods should have access to private properties", () => {
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

          getValue() {
            return this.#value
          }

          setValue(value) {
            this.#value = value
          }
        }

        let store = new Store()

        expect(() => store.getValue()).not.to.throw()
        expect(getSpy).to.be.called.with(10)
        expect(() => store.setValue(20)).not.to.throw()
        expect(setSpy).to.be.called.with(10, 20)
      });

      it("getters and setters should have access to private properties", () => {
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

          get privateValue() {
            return this.#value
          }

          set privateValue(value) {
            this.#value = value
          }
        }

        let store = new Store()

        expect(() => store.privateValue).not.to.throw()
        expect(getSpy).to.be.called.with(10)
        expect(() => store.privateValue = 20).not.to.throw()
        expect(setSpy).to.be.called.with(10, 20)
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

    it("the constructor should succeed when a non-decorated class extends a decorated class", () => {
      @VueStore
      class ParentStore {
      }

      class ChildStore extends ParentStore {
      }

      expect(() => new ChildStore()).not.to.throw()
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


// no extends
it("when not extending VueStore the original won't be reactive", async () => {
  class Store {
    value = 10
    bump: () => void

    constructor() {
      this.bump = () => this.value++
    }
  }

  const original = new Store()
  const store = createStore(original)
  const valueSpy = spy()
  watch(() => store.value, valueSpy)

  store.value = 20 // accessing through the proxy

  await nextTick()
  expect(valueSpy).to.be.called.with(20, 10)
  valueSpy.reset()

  store.bump() // using `this` captured in the constructor
  original.value++ // using the original directly

  await nextTick()
  expect(valueSpy).not.to.be.called()
  expect(store.value).to.equal(22)
});
