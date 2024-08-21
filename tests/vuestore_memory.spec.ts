import {assert, expect} from 'chai';
import VueStore from '../src';

// disabled as this depends on GC behavior and thus is unreliable
xdescribe('Memory management', () => {
  it("should not hold references", function(done) {
    this.timeout(5000)

    @VueStore
    class Store extends VueStore {
      constructor(public prop: number) {
        super()
      }
    }

    const didCollect = testGC(i => new Store(i))
    if(!didCollect) {
      assert.fail('a net-negative GC pass should have run')
    }
    done()
  })

  // so far haven't succeeded in implementing this
  it("should not hold references when watches depend on a global store", function(done) {
    this.timeout(5000)

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

      'on.immediate:computedProp'() {
        // nop
      }
    }

    const didCollect = testGC(i => new Store(i))
    if(!didCollect) {
      assert.fail('a net-negative GC pass should have run')
    }
    done()
  })
})

/**
 * Runs the supplied function repeatedly, returning true if a net-negative GC pass occurred
 */
function testGC(testFn: (i: number) => void, rounds: number = 20, iterations: number = 10000): boolean {
  let gcRounds = 0
  for (let i = 0; i < rounds; i++) {
    let start = process.memoryUsage().heapUsed
    for(let j = 0; j < iterations; j++) {
      testFn(i * iterations + j)
    }
    let end = process.memoryUsage().heapUsed
    if(end < start) {
      gcRounds++
    }
  }
  return gcRounds > 1
}
