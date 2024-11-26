import {assert, expect} from 'chai';
import {createStore} from '../src';
import Vue, {computed, nextTick, reactive, watch} from "vue";
import {spy, SpySet} from "./test_utils";
import {testWatches} from "./vuestore_shared";

type C = { new(...args: any[]): {} }

describe("createStore", () => {
  it("properties should proxied from the original instance", () => {
    class Store {
      plain = 10
      'string!' = 20
      declared: number

      constructor() {
        this.declared = 30
        this['notDeclared'] = 40
      }
    }

    const original = new Store()
    let store = createStore(original)
    expect(store).to.include({plain: 10, 'string!': 20, declared: 30, notDeclared: 40})
    expect(original).to.include({plain: 10, 'string!': 20, declared: 30, notDeclared: 40})

    store['late'] = 50
    expect(store).to.include({late: 50})
    expect(original).to.include({late: 50})

    original.plain = -10
    expect(original.plain).to.equal(-10)
    expect(store.plain).to.equal(-10)
  });

  it("properties should be reactive", async () => {
    class Store {
      plain = 10
      declared: number

      constructor() {
        this.declared = 20
        this['notDeclared'] = 30
      }
    }

    let store = createStore(new Store())
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

  testWatches(c => c, Object, createStore)

  it("watches should be created for indirect (string) references", async () => {
    const watchSpy = spy()

    class Store {
      value = 10

      'on:value' = 'indirect'

      indirect(...args) {
        watchSpy(...args)
      }
    }

    let store = createStore(new Store())

    store.value++
    await nextTick()

    expect(watchSpy).to.be.called.with(11, 10)
  });

  it("watches should be created for functions defined directly on the instance", async () => {
    const watchSpy = spy()

    class Store {
      value = 10

      'on:value' = function (...args) {
        watchSpy(...args)
      }
    }

    let store = createStore(new Store())

    store.value++
    await nextTick()

    expect(watchSpy).to.be.called.with(11, 10)
  });

  it("methods should be accessible and reactive", async () => {
    class Store {
      value = 10

      changeValue() {
        this.value = 100
      }
    }

    let valueSpy = spy()
    let store = createStore(new Store())
    watch(() => store.value, valueSpy)

    store.changeValue()
    await nextTick()
    expect(valueSpy).to.be.called.with(100, 10)
  });

  it("non-arrow functions should have `this` bound to the reactive instance", async () => {
    class Store {
      value = 10
      changeValue: Function

      constructor() {
        this.changeValue = function () {
          this.value = 100
        }
      }
    }

    let valueSpy = spy()
    let store = createStore(new Store())
    watch(() => store.value, valueSpy)

    store.changeValue()
    await nextTick()
    expect(valueSpy).to.be.called.with(100, 10)
  });

  it("instanceof should return true", () => {
    class Store {
    }

    let store = createStore(new Store())

    expect(store).to.be.instanceof(Store)
  });

  describe("limitations", () => {
    it("the original won't be reactive", async () => {
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

    it("watches will be duplicated if the object is passed to createStore multiple times", async () => {
      let spies = {
        plainSpy: spy(),
        lateSpy: spy(),
      }

      class Store {
        plain = 10
        late = 20

        'on:plain'(...args) {
          spies.plainSpy(...args)
        }
      }

      let store = createStore(new Store())
      store['on:late'] = function(...args) {
        spies.lateSpy(...args)
      }
      store = createStore(store)

      store.plain++
      store.late++

      await nextTick()

      expect(spies.plainSpy, 'plain').to.be.called.exactly(2)
      expect(spies.lateSpy, 'late').to.be.called.exactly(1)
    });

    it("methods, getters, and setters won't have access to private properties", () => {
      class Store {
        #value = 10

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

      let store = createStore(new Store())

      expect(() => store.privateValue).to.throw(TypeError)
      expect(() => store.privateValue = 20).to.throw(TypeError)
      expect(() => store.bumpValue()).to.throw(TypeError)
    });
  });
});
