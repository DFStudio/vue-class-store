import chai from 'chai';
import {default as spiesPlugin} from 'chai-spies';

chai.use(spiesPlugin)

type ResettableSpy = { (...args): void } & ChaiSpies.Resetable

export function spy(): ResettableSpy {
  let spy = chai.spy()
  spy.reset = () => { // https://github.com/chaijs/chai-spies/issues/104
    spy['__spy'].calls = []
    spy['__spy'].called = false
    return spy
  }
  return spy
}

export class SpySet implements Record<string | number, ResettableSpy> {
  #spies = new Map<string | number | symbol, ResettableSpy>()

  constructor() {
    return new Proxy(this, {
      get: (obj, prop) => {
        if (Reflect.has(this, prop)) {
          return Reflect.get(this, prop)
        } else {
          if (!this.#spies.has(prop)) {
            this.#spies.set(prop, spy())
          }
          return this.#spies.get(prop)
        }
      },
    });
  }

  resetAll = Object.assign(() => {
    this.#spies.forEach(e => e.reset())
  }, {reset() {}}) as ResettableSpy;

  [key: string]: ResettableSpy;

  [key: number]: ResettableSpy;
}
