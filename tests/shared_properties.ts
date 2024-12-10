import {assert, expect} from 'chai';
import {spy, watchSpy} from "./test_utils";

/**
 * Shared between `createStore`, `@VueStore`, and `extends Reactive`
 */
export function testProperties(
    decorator: <T extends abstract new(...args: any[]) => any>(constructor: T) => T,
    superclass: { new(): object },
    wrapperFn: <T extends object>(value: T) => T,
) {
  describe("shared > properties", () => {
    it("simple properties should cause reactions when mutated", () => {
      @decorator
      class Store extends superclass {
        plain = 10
      }

      let store = wrapperFn(new Store())
      const reactionSpy = watchSpy(() => store.plain)
      store.plain = 100
      expect(reactionSpy).to.be.called.with(100, 10)
    });

    it("simple properties added after initialization should cause reactions when mutated", () => {
      @decorator
      class Store extends superclass {
      }

      let store = wrapperFn(new Store())
      store['plain'] = 10 // added after initialization
      const reactionSpy = watchSpy(() => store['plain'])
      store['plain'] = 100
      expect(reactionSpy).to.be.called.with(100, 10)
    });

    it("computed properties should be cached", () => {
      const recomputeSpy = spy()
      @decorator
      class Store extends superclass {
        plain = 10

        get computed() {
          recomputeSpy()
          return this.plain
        }
      }

      let store = wrapperFn(new Store())

      expect(store.computed).to.equal(10)
      expect(recomputeSpy).to.be.called()
      recomputeSpy.reset()

      expect(store.computed).to.equal(10)
      expect(recomputeSpy).not.to.be.called()

      store.plain = 100

      expect(store.computed).to.equal(100)
      expect(recomputeSpy).to.be.called()
    });

    it("computed properties should work after Object.freeze", () => {
      @decorator
      class Store extends superclass {
        plain = 10

        get computed() {
          return this.plain + 1
        }
      }

      let store = wrapperFn(new Store())
      expect(store.computed).to.equal(11)
      Object.freeze(store)
      expect(() => store.computed).not.to.throw()
    });
  })
}
