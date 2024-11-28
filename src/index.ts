import {reactive} from 'vue'
import {getAllDescriptors} from "./impl/util";
import {addComputed} from "./impl/computed";
import {createWatches, destroyWatches} from "./impl/watches";

/**
 * Create a store from the given object. The returned value will be a wrapper around the passed model
 */
export function createStore<T extends object>(model: T): T {
  const descriptors = Object.entries(getAllDescriptors(model))
  const reactiveInstance = reactive(model)
  addComputed(reactiveInstance, descriptors)
  createWatches(reactiveInstance, descriptors)
  return reactiveInstance as T
}

/**
 * Destroy the given store, destroying its computed properties and watches, allowing it to be garbage collected.
 */
export function destroyStore(instance: object) {
  // computed properties don't need to be cleaned up
  destroyWatches(instance)
}

/**
 * Extend this class to have your class be reactive. Computed properties will be cached, but `on:foo` watch functions
 * aren't supported. If you need watches, use {@link VueStore}
 */
export class Reactive {
  constructor() {
    const descriptors = Object.entries(getAllDescriptors(Object.getPrototypeOf(this)))
    const reactiveThis = reactive(this)
    // watches require late initialization to work properly, so we only do computed properties
    addComputed(reactiveThis, descriptors)
    return reactiveThis
  }
}

interface VueStore {
  new(): object

  <T extends abstract new(...args: any[]) => any>(constructor: T): T
}

/**
 * Create a fully-featured Vue store. Computed properties will be cached and watches can be added by defining
 * `on:some.watch` functions.
 *
 * All classes extending `VueStore` *must* be decorated with `@VueStore`. This includes all subclasses.
 *
 * Before discarding a `VueStore` instance that directly or indirectly watches any long-lived reactive state, pass the
 * instance to {@link destroyStore}.
 */
const VueStore: VueStore = function VueStore(this: object, constructor?: { new(...args: any[]): {} }): any {
  if (constructor === undefined) { // called as a bare constructor
    if (!isDecorated(Object.getPrototypeOf(this))) {
      throw TypeError(`Class ${this.constructor.name} isn't decorated with @VueStore`)
    }
    return reactive(this)
  } else { // called as a decorator
    if (isDecorated(constructor.prototype)) // already a VueStore class
      return constructor

    const descriptors = Object.entries(getAllDescriptors(constructor.prototype))

    const wrapperClass = {
      // preserve the class name. Useful for instanceof checks.
      // https://stackoverflow.com/a/9479081 | https://stackoverflow.com/a/48813707
      [constructor.name]: class extends constructor {
        constructor(...args) {
          super(...args)

          // when instantiating a store, the *topmost* class must be decorated in order for computed properties and
          // watches to be correctly initialized
          if (!isDecorated(Object.getPrototypeOf(this))) {
            throw TypeError(`Class ${this.constructor.name} isn't decorated with @VueStore`)
          }

          const reactiveThis = reactive(this)
          // only the topmost class should handle adding computed/watches
          if (wrapperClass.prototype === Object.getPrototypeOf(this)) {
            addComputed(reactiveThis, descriptors)
            createWatches(reactiveThis, descriptors)
          }
          return reactiveThis
        }
      }
    }[constructor.name]
    wrapperClass.prototype[vueStoreDecorated] = true
    return wrapperClass
  }
} as VueStore

export default VueStore

const vueStoreDecorated = Symbol("vue-class-store__decorated")

function isDecorated(prototype: object) {
  return Object.hasOwn(prototype, vueStoreDecorated)
}
