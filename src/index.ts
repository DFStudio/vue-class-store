import {computed, reactive, watch, WatchCallback, WatchHandle, WatchOptions} from 'vue'

function getAllDescriptors(model: object | null): Record<string, PropertyDescriptor> {
  if (model === null || model === Object.prototype) {
    return {}
  }
  const descriptors = Object.getOwnPropertyDescriptors(model)
  const parentDescriptors = getAllDescriptors(Object.getPrototypeOf(model))
  return {...parentDescriptors, ...descriptors}
}

function getValue(value: Record<any, any> | null | undefined, path: string[]) {
  for (let i = 0; i < path.length; i++){
    const key = path[i];
    if (value == null)
      value = undefined
    else
      value = value[key]
  }
  return value
}

// 'on.flag:target', 'on.flag1.flag2:target'
// 'on.deep=1.immediate:target'
// flags: deep, deep=N, immediate, once, pre, post, sync
let watchPattern = /^on(\.[.a-zA-Z0-9=]*)?:(.*)$/

function isWatch(key: string): boolean {
  return watchPattern.test(key)
}

type WatchDefinition = { path: string[], options: WatchOptions }

function parseWatch(key: string): WatchDefinition {
  let match = key.match(watchPattern)!
  let flags = match[1] ?? ''
  let deepMatch = flags.match(/\.deep(?:=(\d+))?/)
  return {
    path: match[2].split('.'),
    options: {
      deep:
          deepMatch && deepMatch[1] ? parseInt(deepMatch[1]) :
              deepMatch ? true :
                  undefined,
      immediate: flags.includes('.immediate'),
      once: flags.includes('.once'),
      flush:
          flags.includes('.pre') ? 'pre'
              : flags.includes('.post') ? 'post'
                  : flags.includes('.sync') ? 'sync'
                      : undefined
    }
  }
}

function addComputed(instance: object, descriptors: [string, PropertyDescriptor][]) {
  descriptors.forEach(([key, desc]) => {
    const {get, set} = desc
    if (get) {
      let ref = set
          ? computed({get: get.bind(instance), set: set.bind(instance)})
          : computed(get.bind(instance))

      Object.defineProperty(instance, key, {
        value: ref, // vue unwraps this Ref automatically when accessing it
        writable: desc.writable,
        enumerable: desc.enumerable,
        configurable: true
      })
    }
  })
}

// https://github.com/vuejs/core/pull/12236
function compatWatch(source: () => any, callback: WatchCallback, options: WatchOptions): WatchHandle {
  if (options.deep != undefined) {
    return watch(source, callback, options) // if deep is specified, even `deep: 0`, don't activate the compat
  } else {
    return watch(() => {
      const value = source()
      if (Array.isArray(value)) {
        value.slice(0, 0) // establish reactive dependency on array iteration order
        return {COMPAT_ARRAY_UNWRAP: value}
      }
      return value
    }, (newValue, oldValue, onCleanup) => {
      if (newValue && newValue.COMPAT_ARRAY_UNWRAP) {
        newValue = newValue.COMPAT_ARRAY_UNWRAP
      }
      if (oldValue && oldValue.COMPAT_ARRAY_UNWRAP) {
        oldValue = oldValue.COMPAT_ARRAY_UNWRAP
      }

      return callback(newValue, oldValue, onCleanup)
    }, options)
  }
}

/**
 * Scans the model for `on:*` watchers and then creates watches for them. This method expects to be passed a reactive
 * model.
 */
function addWatches(instance: object, descriptors: [string, PropertyDescriptor][]) {
  descriptors.forEach(([key, desc]) => {
    if (isWatch(key)) {
      let {path, options} = parseWatch(key)
      let callback = typeof desc.value === 'string' ? instance[desc.value] : desc.value
      if (typeof callback === 'function') {
        compatWatch(() => getValue(instance, path), callback.bind(instance), options)
      }
    }
  })
}

function addReactivity<T extends object>(instance: T, descriptors: [string, PropertyDescriptor][]): T {
  const reactiveInstance = reactive(instance)
  addComputed(reactiveInstance, descriptors)
  addWatches(reactiveInstance, descriptors)
  return reactiveInstance as T
}

export function createStore<T extends object>(model: T): T {
  return addReactivity(model, Object.entries(getAllDescriptors(model)))
}

export const Reactive = function Reactive(this: object): object {
  return reactive(this)
} as unknown as (new() => object)

type VueStoreMetadata = {}
const vueStoreMetadata = Symbol("@@vueStoreMetadata")

function getStoreMetadata(prototype: object): VueStoreMetadata | undefined {
  return Object.getOwnPropertyDescriptor(prototype, vueStoreMetadata)?.value
}

function setStoreMetadata(prototype: object, metadata: VueStoreMetadata) {
  return prototype[vueStoreMetadata] = metadata
}

function hasStoreFlag(prototype: object) {
  return getStoreMetadata(prototype) != undefined
}

function findStorePrototype(prototype: object): object | null {
  while (prototype !== null && prototype !== Object.prototype) {
    if (hasStoreFlag(prototype)) {
      return prototype
    } else {
      prototype = Object.getPrototypeOf(prototype)
    }
  }
  return null
}

interface VueStore {
  new(): object
  <T extends abstract new(...args: any[]) => any>(constructor: T): T
}

const VueStore: VueStore = function VueStore(this: object, constructor?: { new(...args: any[]): {} }): any {
  if (constructor === undefined) { // called as a bare constructor
    if (!hasStoreFlag(Object.getPrototypeOf(this))) {
      throw TypeError(`Class ${this.constructor.name} isn't decorated with @VueStore`)
    }
    return reactive(this)
  } else { // called as a decorator
    if (hasStoreFlag(constructor.prototype)) // already a VueStore class
      return constructor

    const wrapper = {
      // preserve the class name. Useful for instanceof checks.
      // https://stackoverflow.com/a/9479081 | https://stackoverflow.com/a/48813707
      [constructor.name]: class extends constructor {
        constructor(...args) {
          super(...args)
          // introspect this class's prototype
          if (findStorePrototype(Object.getPrototypeOf(this)) === wrapper.prototype) {
            // if this is the topmost `extends VueStore(Superclass)` or `@VueStore`, add full reactivity
            // at this point, `this` won't include dynamic keys from subclasses
            return addReactivity(
                this,
                Object.entries(getAllDescriptors(Object.getPrototypeOf(this)))
            )
          } else {
            // otherwise, make it a reactive instance, but don't apply any watches or computed properties
            // the topmost VueStore decorator is responsible
            return reactive(this)
          }
        }
      }
    }[constructor.name]
    setStoreMetadata(wrapper.prototype, {})
    return wrapper
  }
} as VueStore

export default VueStore
