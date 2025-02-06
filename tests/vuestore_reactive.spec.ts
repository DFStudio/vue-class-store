import {assert, expect} from 'chai';
import {Reactive} from '../src';
import Vue, {computed, nextTick, reactive, watch} from "vue";
import {spy, SpySet} from "./test_utils";
import {testWatches} from "./shared_watches";
import {testProperties} from "./shared_properties";
import {testPrivateMembers} from "./shared_private_members";
import {testCommon} from "./shared_common";

describe("extends Reactive", () => {
  testCommon(c => c, Reactive, v => v)
  testProperties(c => c, Reactive, v => v)

  it("methods should be accessible and reactive", async () => {
    class Store extends Reactive {
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
    class Store extends Reactive {
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
    class Store extends Reactive {
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

  testPrivateMembers(c => c, Reactive, v => v)

  describe("inheritance", () => {
    it("overriding getters/setters only use the override", async () => {
      class BaseStore extends Reactive {
        plain = 10

        get computed() {
          return this.plain + 1
        }
      }

      class ChildStore extends BaseStore {
        get computed() {
          return this.plain + 2
        }
      }

      let store = new ChildStore()
      expect(store.computed).to.equal(12)
    });

    it("overriding a getter/setter with a get-only or set-only property should behave correctly", () => {
      const spyset = new SpySet()

      class BaseStore extends Reactive {
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
  });
});
