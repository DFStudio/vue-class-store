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
  describe("shared > misc", () => {
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
  })
}
