import {assert, expect} from 'chai';
import VueStore, {destroyStore, Reactive} from '../src';
import {testGC} from "./test_utils";

// disabled as this depends on GC behavior and thus is unreliable
describe('Memory management', () => {
  it("creating an instance shouldn't hold a reference", async function () {
    this.timeout(1000)

    @VueStore
    class Store extends VueStore {
      constructor(public prop: number) {
        super()
      }
    }

    const didCollect = await testGC(i => new Store(i))
    if (!didCollect) {
      assert.fail("the stores shouldn't be retained")
    }
  })

  it("computed props depending only on the store itself shouldn't keep the store from being collected", async function () {
    this.timeout(1000)

    @VueStore
    class Store extends VueStore {
      constructor(public prop: number) {
        super()
      }

      get computedProp() {
        return this.prop + 1
      }
    }

    const didCollect = await testGC(i => {
      const x = new Store(i)
      x.computedProp // make sure it's computed at least once
      return x
    })
    if (!didCollect) {
      assert.fail("the stores shouldn't be retained")
    }
  })

  it("watches depending only on the store itself shouldn't keep the store from being collected", async function () {
    this.timeout(1000)

    @VueStore
    class Store extends VueStore {
      constructor(public prop: number) {
        super()
      }

      get computedProp() {
        return this.prop + 1
      }

      'on:computedProp'() {
        // nop
      }
    }

    const didCollect = await testGC(i => new Store(i))
    if (!didCollect) {
      assert.fail("the stores shouldn't be retained")
    }
  })

  it("computed props depending on a global store shouldn't keep their stores from being collected", async function () {
    this.timeout(1000)

    @VueStore
    class GlobalStore extends VueStore {
      value = 10
    }

    const globalStore = new GlobalStore()

    @VueStore
    class Store extends VueStore {
      constructor(public prop: number) {
        super()
      }

      get computedProp() {
        return this.prop + globalStore.value
      }
    }

    const didCollect = await testGC(i => {
      const x = new Store(i)
      x.computedProp // make sure it's computed at least once
      return x
    })
    if (!didCollect) {
      assert.fail("the stores shouldn't be retained")
    }
  })

  it("watches depending on a global store will keep their stores from being collected", async function () {
    this.timeout(1000)

    @VueStore
    class GlobalStore extends VueStore {
      value = 10
    }

    const globalStore = new GlobalStore()

    @VueStore
    class Store extends VueStore {
      constructor(public prop: number) {
        super()
      }

      get computedProp() {
        return this.prop + globalStore.value
      }

      'on:computedProp'() {
        // nop
      }
    }

    const didCollect = await testGC(i => new Store(i))
    if (didCollect) {
      assert.fail("the stores shouldn't be cleaned up")
    }
  })

  it("destroyStore should clear dependencies on global state", async function () {
    this.timeout(1000)

    @VueStore
    class GlobalStore extends VueStore {
      value = 10
    }

    const globalStore = new GlobalStore()

    @VueStore
    class Store extends VueStore {
      constructor(public prop: number) {
        super()
      }

      get computedProp() {
        return this.prop + globalStore.value
      }

      'on:computedProp'() {
        // nop
      }
    }

    const didCollect = await testGC(i => {
      const x = new Store(i)
      x.computedProp
      return x
    }, v => {
      destroyStore(v)
    })
    if (!didCollect) {
      assert.fail("references won't have been cleaned up")
    }
  })

  it("classes extending Reactive shouldn't establish dependencies when accessing global state", async function () {
    this.timeout(1000)

    @VueStore
    class GlobalStore extends VueStore {
      value = 10
    }

    const globalStore = new GlobalStore()

    class Store extends Reactive {
      constructor(public prop: number) {
        super()
      }

      get computedProp() {
        return this.prop + globalStore.value
      }
    }

    const didCollect = await testGC(i => {
      const x = new Store(i)
      x.computedProp // make sure it's computed at least once
      return x
    })
    if (!didCollect) {
      assert.fail("references won't have been cleaned up")
    }
  })
})
