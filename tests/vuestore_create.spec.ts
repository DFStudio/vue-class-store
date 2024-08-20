import {assert, expect} from 'chai';
import VueStore from '../src';
import Vue, {computed, nextTick, reactive, watch} from "vue";
import {spy, SpySet} from "./test_utils";

type C = { new(...args: any[]): {} }

describe("VueStore.create", () => {
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
    let store = VueStore.create(original)
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

    let store = VueStore.create(new Store())
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

    class Store {
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

    let store = VueStore.create(new Store())

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
    let spies = new SpySet()

    class Store {
      nested = {value: 10}
      replaced: object = {value: 20}
      replacedWithMissing: object = {value: 30}
      replacedFromMissing: object = {}
      explicitReactive = reactive({value: 50})

      'on:nested.value'(...args) {
        spies['nested.value'](...args)
      }

      'on:replaced'(...args) {
        spies['replaced'](...args)
      }

      'on:replaced.value'(...args) {
        spies['replaced.value'](...args)
      }

      'on:replacedWithMissing.value'(...args) {
        spies['replacedWithMissing.value'](...args)
      }

      'on:replacedFromMissing.value'(...args) {
        spies['replacedFromMissing.value'](...args)
      }

      'on:explicitReactive.value'(...args) {
        spies['explicitReactive.value'](...args)
      }
    }

    let store = VueStore.create(new Store())

    store.nested.value++
    store.replaced = {value: -20}
    store.replacedWithMissing = {}
    store.replacedFromMissing = {value: 40}
    store.explicitReactive.value++

    await nextTick()

    expect(spies['nested.value'], 'nested.value').to.be.called.with(11, 10)
    expect(spies['replaced'], 'replaced').to.be.called.with({value: -20}, {value: 20})
    expect(spies['replaced.value'], 'replaced.value').to.be.called.with(-20, 20)
    expect(spies['replacedWithMissing.value'], 'replacedWithMissing.value').to.be.called.with(undefined, 30)
    expect(spies['replacedFromMissing.value'], 'replacedFromMissing.value').to.be.called.with(40, undefined)
    expect(spies['explicitReactive.value'], 'explicitReactive.value').to.be.called.with(51, 50)
  });

  it("nested watches should correctly handle null and undefined intermediary values", async () => {
    let spies = new SpySet()

    class Store {
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

    let store = VueStore.create(new Store())

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

  it("watches should be created for indirect (string) references and functions defined directly on the instance", async () => {
    let spies = {
      runtimeSpy: spy(),
      indirectSpy: spy(),
    }

    class Store {
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

    let store = VueStore.create(new Store())

    store.runtimeValue++
    store.indirectValue++

    await nextTick()

    expect(spies.runtimeSpy, 'runtimeValue').to.be.called.with(11, 10)
    expect(spies.indirectSpy, 'indirectValue').to.be.called.with(21, 20)
  });

  it("methods should be accessible and reactive", async () => {
    class Store {
      value = 10

      changeValue() {
        this.value = 100
      }
    }

    let valueSpy = spy()
    let store = VueStore.create(new Store())
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
    let store = VueStore.create(new Store())
    watch(() => store.value, valueSpy)

    store.changeValue()
    await nextTick()
    expect(valueSpy).to.be.called.with(100, 10)
  });

  it("instanceof should return true", () => {
    class Store {
    }

    let store = VueStore.create(new Store())

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
      const store = VueStore.create(original)
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

    it("watches will be duplicated if the object is passed to VueStore.create multiple times", async () => {
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

      let store = VueStore.create(new Store())
      store['on:late'] = function(...args) {
        spies.lateSpy(...args)
      }
      store = VueStore.create(store)

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

      let store = VueStore.create(new Store())

      expect(() => store.privateValue).to.throw(TypeError)
      expect(() => store.privateValue = 20).to.throw(TypeError)
      expect(() => store.bumpValue()).to.throw(TypeError)
    });
  });
});
