import {assert, expect} from 'chai';
import {spy, watchSpy} from "./test_utils";

/**
 * Shared between `@VueStore` and `extends Reactive`
 */
export function testPrivateMembers(
    decorator: <T extends abstract new(...args: any[]) => any>(constructor: T) => T,
    superclass: { new(): object },
    wrapperFn: <T extends object>(value: T) => T,
) {
  describe("shared > private members", () => {
    it("public methods should have access to private fields", () => {
      let external = -1

      @decorator
      class Store extends superclass {
        #value = 10

        bumpValue() {
          this.#value++
          external = this.#value
        }
      }

      let store = wrapperFn(new Store())

      expect(() => store.bumpValue()).not.to.throw()
      expect(external).to.equal(11)
    });

    it("public methods should have access to private methods", () => {
      const callSpy = spy()

      @decorator
      class Store extends superclass {
        v = 10

        #value(...args) {
          callSpy(...args)
          return this.v * 2
        }

        getValue() {
          return this.#value()
        }
      }

      let store = wrapperFn(new Store())

      expect(() => store.getValue()).not.to.throw()
      expect(store.getValue()).to.equal(20)
      expect(callSpy).to.be.called()
    });

    it("public methods should have access to private properties", () => {
      const getSpy = spy()
      const setSpy = spy()

      @decorator
      class Store extends superclass {
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

      let store = wrapperFn(new Store())

      expect(() => store.getValue()).not.to.throw()
      expect(getSpy).to.be.called.with(10)
      expect(() => store.setValue(20)).not.to.throw()
      expect(setSpy).to.be.called.with(10, 20)
    });

    it("public computed properties should have access to private fields", () => {
      @decorator
      class Store extends superclass {
        #value = 10

        get privateValue() {
          return this.#value
        }

        set privateValue(value) {
          this.#value = value
        }
      }

      let store = wrapperFn(new Store())

      expect(() => store.privateValue).not.to.throw()
      expect(store.privateValue).to.equal(10)
      expect(() => store.privateValue = 20).not.to.throw()
    });

    it("public computed properties should have access to private methods", () => {
      const callSpy = spy()

      @decorator
      class Store extends superclass {
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

      let store = wrapperFn(new Store())

      expect(() => store.privateValue).not.to.throw()
      expect(callSpy).to.be.called()
      expect(store.privateValue).to.equal(20)
      callSpy.reset()
      expect(() => store.privateValue = 40).not.to.throw()
      expect(callSpy).to.be.called.with(40)
    });

    it("public computed properties should have access to private properties", () => {
      const getSpy = spy()
      const setSpy = spy()

      @decorator
      class Store extends superclass {
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

      let store = wrapperFn(new Store())

      expect(() => store.privateValue).not.to.throw()
      expect(getSpy).to.be.called.with(10)
      expect(() => store.privateValue = 20).not.to.throw()
      expect(setSpy).to.be.called.with(10, 20)
    });

    it("private fields should not trigger reactions", () => {
      @decorator
      class Store extends superclass {
        #value = 10

        get privateValue() {
          return this.#value
        }

        set privateValue(value) {
          this.#value = value
        }
      }

      let store = wrapperFn(new Store())

      const reactionSpy = watchSpy(() => store.privateValue)
      store.privateValue = 20
      expect(reactionSpy).not.to.be.called()
    });

    it("private methods should be able to access reactive state", () => {
      @decorator
      class Store extends superclass {
        value = 10

        #getPrivate() {
          return this.value
        }

        getPrivateValue() {
          return this.#getPrivate()
        }
      }

      let store = wrapperFn(new Store())

      expect(store.getPrivateValue()).to.equal(10)
      store.value = 20
      expect(store.getPrivateValue()).to.equal(20)
    });

    it("private methods should be able to mutate reactive state", () => {
      @decorator
      class Store extends superclass {
        value = 10

        #setPrivate(value: number) {
          this.value = value
        }

        setPrivateValue(value: number) {
          this.#setPrivate(value)
        }
      }

      let store = wrapperFn(new Store())

      const reactionSpy = watchSpy(() => store.value)
      store.setPrivateValue(20)
      expect(reactionSpy).to.be.called.with(20, 10)
    });

    it("private properties should be able to access reactive state", () => {
      @decorator
      class Store extends superclass {
        value = 10

        get #privateValue() {
          return this.value
        }

        getPrivateValue() {
          return this.#privateValue
        }
      }

      let store = wrapperFn(new Store())

      expect(store.getPrivateValue()).to.equal(10)
      store.value = 20
      expect(store.getPrivateValue()).to.equal(20)
    });

    it("private properties should be able to mutate reactive state", () => {
      @decorator
      class Store extends superclass {
        value = 10

        get #privateValue() {
          return this.value
        }

        set #privateValue(value) {
          this.value = value
        }

        setPrivateValue(value: number) {
          this.#privateValue = value
        }
      }

      let store = wrapperFn(new Store())

      const reactionSpy = watchSpy(() => store.value)
      store.setPrivateValue(20)
      expect(reactionSpy).to.be.called.with(20, 10)
    });
  })
}
