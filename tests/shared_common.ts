import {assert, expect} from 'chai';
import {computed} from "vue";
import {spy} from "./test_utils";

/**
 * Shared between `createStore`, `@VueStore`, and `extends Reactive`
 */
export function testCommon(
    decorator: <T extends abstract new(...args: any[]) => any>(constructor: T) => T,
    superclass: { new(): object },
    wrapperFn: <T extends object>(value: T) => T,
) {
  describe("shared > dirty in constructor", () => {
    /**
     * This bug causes a store to be re-computed over and over and over. It was first encountered in the interaction of
     * this component and store (simplified for clarity):
     *
     * ```ts
     * @VueStore
     * class RightSet extends VueStore {
     *   private rights = []
     *
     *   update(value) {
     *     this.rights = value
     *   }
     * }
     *
     * class FolderStore {
     *   folderRights(folderId) {
     *     const rights = new RightSet()
     *     fetchRights(folderId).then(value => rights.update(value))
     *     return rights
     *   }
     * }
     *
     * export default class SomeComponent extends Vue {
     *   get rights() {
     *     return FolderStore.folderRights(this.folderId)
     *   }
     * }
     * ```
     *
     * The issue was that every time `rights.update()` was called, the `get rights()` computed was being marked as dirty,
     * which led to a new `RightSet` being constructed, a new request being submitted, and that then caused it all to
     * loop.
     *
     * After *much* investigation it was tracked down to a reactive dependency on the `vue-class-store__watchScope`
     * symbol. To solve the issue we replace `instance[vueStoreWatchScope] ??= ...` with `Object.defineProperty`,
     * which won't trigger reactions.
     */
    it("constructing a store shouldn't immediately invalidate the computed that constructed it", async () => {
      const constructSpy = spy()

      @decorator
      class Store extends superclass {
      }

      const cachedComputed = computed(() => {
        constructSpy()
        return wrapperFn(new Store())
      })

      cachedComputed.value // <- constructs first value
      cachedComputed.value // <- should be cached
      expect(constructSpy).to.be.called.once
    });

    // when using the wrapper function all the constructor stuff happens long before the store ever touches it
    if (superclass !== Object) {
      it("constructing a store with a property shouldn't immediately invalidate the computed that constructed it", async () => {
        const constructSpy = spy()

        @decorator
        class Store extends superclass {
          constructor(public x: number) {
            super();
          }
        }

        const cachedComputed = computed(() => {
          constructSpy()
          return wrapperFn(new Store(5))
        })

        cachedComputed.value // <- constructs first value
        cachedComputed.value // <- should be cached
        expect(constructSpy).to.be.called.once
      });

      it("mutating a property during construction shouldn't immediately invalidate the computed", async () => {
        const constructSpy = spy()

        @decorator
        class Store extends superclass {
          public x: number = 0

          constructor(x: number) {
            super()
            this.x = x
          }
        }

        const cachedComputed = computed(() => {
          constructSpy()
          return wrapperFn(new Store(5))
        })

        cachedComputed.value // <- constructs first value
        cachedComputed.value // <- should be cached
        expect(constructSpy).to.be.called.once
      });

      it("accessing then mutating a property during construction will immediately invalidate the computed that constructed it", async () => {
        const constructSpy = spy()

        @decorator
        class Store extends superclass {
          constructor(public x: number) {
            super()
            const n = this.x
            this.x = x + 1
          }
        }

        const cachedComputed = computed(() => {
          constructSpy()
          return wrapperFn(new Store(5))
        })

        cachedComputed.value // <- constructs first value
        cachedComputed.value // <- won't be cached
        expect(constructSpy).to.be.called.exactly(2)
      });

      it("mutating a computed property during construction shouldn't immediately invalidate the computed that constructed it", async () => {
        const constructSpy = spy()

        @decorator
        class Store extends superclass {
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
          return wrapperFn(new Store(5))
        })

        cachedComputed.value // <- constructs first value
        cachedComputed.value // <- should be cached
        expect(constructSpy).to.be.called.once
      });
    }
  })

  describe("shared > dirty after constructor", () => {
    it("mutating a property after construction shouldn't immediately invalidate the computed that constructed it", async () => {
      const constructSpy = spy()

      @decorator
      class Store extends superclass {
        constructor(public x: number) {
          super()
        }
      }

      const cachedComputed = computed(() => {
        constructSpy()
        const store = wrapperFn(new Store(5))
        store.x = 4
        return store
      })

      cachedComputed.value // <- constructs first value
      cachedComputed.value // <- should be cached
      expect(constructSpy).to.be.called.once
    });

    it("accessing then mutating a property after construction will immediately invalidate the computed that constructed it", async () => {
      const constructSpy = spy()

      @decorator
      class Store extends superclass {
        constructor(public x: number) {
          super()
        }
      }

      const cachedComputed = computed(() => {
        constructSpy()
        const store = wrapperFn(new Store(5))
        const n = store.x
        store.x = 4
        return store
      })

      cachedComputed.value // <- constructs first value
      cachedComputed.value // <- won't be cached
      expect(constructSpy).to.be.called.exactly(2)
    });

    it("mutating a computed property after construction shouldn't immediately invalidate the computed that constructed it", async () => {
      const constructSpy = spy()

      @decorator
      class Store extends superclass {
        constructor(public x: number) {
          super()
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
        const store = wrapperFn(new Store(5))
        store.foo = 4
        return store
      })

      cachedComputed.value // <- constructs first value
      cachedComputed.value // <- should be cached
      expect(constructSpy).to.be.called.once
    });

    it("assigning to a computed prop during construction shouldn't immediately invalidate the computed that constructed it", async () => {
      const constructSpy = spy()

      @decorator
      class Store extends superclass {
        public x: number = 0

        constructor(x: number) {
          super()
          this.foo = x
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
        const store = wrapperFn(new Store(5))
        return store
      })

      cachedComputed.value // <- constructs first value
      cachedComputed.value // <- should be cached
      expect(constructSpy).to.be.called.once
    });
  })
}
