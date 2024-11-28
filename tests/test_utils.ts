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

/**
 * https://joyeecheung.github.io/blog/2024/03/17/memory-leak-testing-v8-node-js-1/
 */
export function gcUntil(condition: () => boolean, error?: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    let count = 0;

    function gcAndCheck() {
      setImmediate(() => {
        count++;
        global.gc();
        if (condition()) {
          resolve(true);
        } else if (count < 10) {
          gcAndCheck();
        } else {
          if (error) {
            reject(Error(error))
          } else {
            resolve(false);
          }
        }
      });
    }

    gcAndCheck();
  });
}

export async function testGC<V>(
    generator: (i: number) => V,
    destroy?: (value: V) => void,
    count: number = 10_000,
    threshold: number = 0.95
): Promise<boolean> {
  let x = Array.from({ length: 100000 }, (x, i) => ({v: i}))
  const preStart = process.memoryUsage().heapUsed
  x = []
  await gcUntil(() => process.memoryUsage().heapUsed < preStart, "no pre-start gc pass")
  const start = process.memoryUsage().heapUsed

  let values = Array.from({ length: count }, (v, i) => generator(i))

  const mid = process.memoryUsage().heapUsed

  if (destroy)
    values.forEach(destroy)
  values = []

  await gcUntil(() => process.memoryUsage().heapUsed < mid, "no ending gc pass")
  const end = process.memoryUsage().heapUsed

  const allocated = mid - start
  const freed = mid - end
  const ratio = freed / allocated
  // console.log(`GC results: start=${start} mid=${mid} end=${end} | allocated=${allocated} freed=${freed} ratio=${ratio}`)
  if (allocated < 0 || freed < 0) {
    throw Error(`Invalid allocated/freed: ${allocated}/${freed}`)
  }
  return ratio > threshold
}
