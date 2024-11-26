import {assert, expect} from 'chai';
import {nextTick, reactive} from "vue";
import {spy} from "./test_utils";

export function testWatches(
    decorator: <T extends abstract new(...args: any[]) => any>(constructor: T) => T,
    superclass: { new(): object },
    wrapperFn: <T extends object>(value: T) => T,
) {
  describe("watches", () => {
    it("plain watch", async () => {
      const watchSpy = spy()

      @decorator
      class Store extends superclass {
        value = 10

        'on:value'(...args) {
          watchSpy(...args)
        }
      }

      let store = wrapperFn(new Store())

      store.value++
      await nextTick()

      expect(watchSpy).to.be.called.with(11, 10)
    });

    it("watch on computed should compute initial value", async () => {
      const computeSpy = spy()
      const watchSpy = spy()
      const unusedComputedSpy = spy()

      @decorator
      class Store extends superclass {
        value = 10

        get computed() {
          computeSpy(this.value)
          return `${this.value}`
        }

        get unwatchedComputed() {
          unusedComputedSpy(this.value)
          return `${this.value}`
        }

        'on:computed'(...args) {
          watchSpy(...args)
        }
      }

      let store = wrapperFn(new Store())

      expect(computeSpy, 'initial value computed').to.be.called.with(10)
      expect(unusedComputedSpy, 'unwatched getter never accessed').not.to.be.called()

      store.value++
      await nextTick()

      expect(computeSpy, 'computed getter').to.be.called.with(11)
      expect(watchSpy, 'watcher').to.be.called.with('11', '10')
    });

    describe("watch flags", () => {
      it(".immediate", async () => {
        const watchSpy = spy()

        @decorator
        class Store extends superclass {
          value = 10

          'on.immediate:value'(...args) {
            watchSpy(...args)
          }
        }

        let store = wrapperFn(new Store())

        expect(watchSpy).to.be.called.with(10, undefined)
        watchSpy.reset()

        store.value++
        await nextTick()

        expect(watchSpy).to.be.called.with(11, 10)
      });

      it(".deep", async () => {
        const watchSpy = spy()

        @decorator
        class Store extends superclass {
          value = {deep: {value: 10}}

          'on.deep:value'(...args) {
            watchSpy(...args)
          }
        }

        let store = wrapperFn(new Store())

        store.value.deep.value++
        await nextTick()

        expect(watchSpy).to.be.called.with(store.value, store.value)
      });

      it(".deep=1", async () => {
        const watchSpy = spy()

        @decorator
        class Store extends superclass {
          value = {shallow: 10, deep: {value: 10}}

          'on.deep=1:value'(...args) {
            watchSpy(...args)
          }
        }

        let store = wrapperFn(new Store())

        store.value.deep.value++
        await nextTick()
        expect(watchSpy).not.to.be.called()

        store.value.shallow++
        await nextTick()
        expect(watchSpy).to.be.called.with(store.value, store.value)
      });

      it(".once", async () => {
        const watchSpy = spy()

        @decorator
        class Store extends superclass {
          value = 10

          'on.once:value'(...args) {
            watchSpy(...args)
          }
        }

        let store = wrapperFn(new Store())

        store.value++
        await nextTick()

        store.value++
        await nextTick()

        expect(watchSpy).to.be.called.once
        expect(watchSpy).to.be.called.with(11, 10)
      });

      it(".sync", async () => {
        const watchSpy = spy()

        @decorator
        class Store extends superclass {
          value = 10

          'on.sync:value'(...args) {
            watchSpy(...args)
          }
        }

        let store = wrapperFn(new Store())

        store.value++
        // no await needed
        expect(watchSpy).to.be.called.with(11, 10)
      });
    });

    describe("nested watches", () => {
      it("basic nested key should work", async () => {
        const rootSpy = spy()
        const watchSpy = spy()

        @decorator
        class Store extends superclass {
          value = {inner: 10}

          'on:value'(...args) {
            rootSpy(...args)
          }

          'on:value.inner'(...args) {
            watchSpy(...args)
          }
        }

        let store = wrapperFn(new Store())

        store.value.inner++
        await nextTick()

        expect(rootSpy).not.to.be.called()
        expect(watchSpy).to.be.called.with(11, 10)
      });

      it("replacing the root object should trigger the watch when the value is different", async () => {
        const rootSpy = spy()
        const watchSpy = spy()

        @decorator
        class Store extends superclass {
          value = {inner: 10}

          'on:value'(...args) {
            rootSpy(...args)
          }

          'on:value.inner'(...args) {
            watchSpy(...args)
          }
        }

        let store = wrapperFn(new Store())
        const value1 = store.value
        const value2 = {inner: 10}
        const value3 = {inner: 20}

        store.value = value2
        await nextTick()

        expect(rootSpy).to.be.called.with(value2, value1)
        rootSpy.reset()
        expect(watchSpy).not.to.be.called()
        watchSpy.reset()

        store.value = value3
        await nextTick()

        expect(rootSpy).to.be.called.with(value3, value2)
        expect(watchSpy).to.be.called.with(20, 10)
      });

      it("replacing with an object missing the nested key should trigger the watch", async () => {
        const watchSpy = spy()

        @decorator
        class Store extends superclass {
          value: any = {inner: 10}

          'on:value.inner'(...args) {
            watchSpy(...args)
          }
        }

        let store = wrapperFn(new Store())

        store.value = {}
        await nextTick()

        expect(watchSpy).to.be.called.with(undefined, 10)
      });

      it("replacing from an object missing the nested key should trigger the watch", async () => {
        const watchSpy = spy()

        @decorator
        class Store extends superclass {
          value: any = {}

          'on:value.inner'(...args) {
            watchSpy(...args)
          }
        }

        let store = wrapperFn(new Store())

        store.value = {inner: 10}
        await nextTick()

        expect(watchSpy).to.be.called.with(10, undefined)
      });

      it("explicit reactive should work", async () => {
        const rootSpy = spy()
        const watchSpy = spy()

        @decorator
        class Store extends superclass {
          value = reactive({inner: 10})

          'on:value'(...args) {
            rootSpy(...args)
          }

          'on:value.inner'(...args) {
            watchSpy(...args)
          }
        }

        let store = wrapperFn(new Store())

        store.value.inner++
        await nextTick()

        expect(rootSpy).not.to.be.called()
        expect(watchSpy).to.be.called.with(11, 10)
      });

      it("nesting should handle undefined roots gracefully", async () => {
        const watchSpy = spy()

        @decorator
        class Store extends superclass {
          value: any = {inner: 10}

          'on:value.inner'(...args) {
            watchSpy(...args)
          }
        }

        let store = wrapperFn(new Store())

        store.value = undefined
        await nextTick()

        expect(watchSpy).to.be.called.with(undefined, 10)
      });

      it("nesting should handle undefined intermediate gracefully", async () => {
        const watchSpy = spy()

        @decorator
        class Store extends superclass {
          value: any = {middle: {inner: 10}}

          'on:value.middle.inner'(...args) {
            watchSpy(...args)
          }
        }

        let store = wrapperFn(new Store())

        store.value.middle = undefined
        await nextTick()

        expect(watchSpy).to.be.called.with(undefined, 10)
      });

      it("nesting should handle undefined leaf gracefully", async () => {
        const watchSpy = spy()

        @decorator
        class Store extends superclass {
          value: any = {inner: 10}

          'on:value.inner'(...args) {
            watchSpy(...args)
          }
        }

        let store = wrapperFn(new Store())

        store.value.inner = undefined
        await nextTick()

        expect(watchSpy).to.be.called.with(undefined, 10)
      });
    });
  });
}