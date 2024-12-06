/**
 * Bundle of: vue-class-store
 * Generated: 2024-12-05
 * Version: 3.0.0
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('vue')) :
  typeof define === 'function' && define.amd ? define(['exports', 'vue'], factory) :
  (global = global || self, factory(global.VueClassStore = {}, global.Vue));
}(this, (function (exports, vue) { 'use strict';

  function getAllDescriptors(model) {
      if (model === null || model === Object.prototype) {
          return {};
      }
      const descriptors = Object.getOwnPropertyDescriptors(model);
      const parentDescriptors = getAllDescriptors(Object.getPrototypeOf(model));
      return Object.assign(Object.assign({}, parentDescriptors), descriptors);
  }

  function addComputed(instance, descriptors) {
      descriptors.forEach(([key, desc]) => {
          const { get, set } = desc;
          if (get) {
              // We *could* just set `value: ref` in the descriptor and Vue will automatically unwrap the ref, however that
              // causes errors if the object is passed through `Object.freeze()`, since the underlying value is a ref, but the
              // proxy returns a different value: https://github.com/vuejs/core/issues/3024
              if (set) {
                  const ref = vue.computed({ get: get.bind(instance), set: set.bind(instance) });
                  Object.defineProperty(instance, key, {
                      get: () => ref.value,
                      set: (v) => ref.value = v,
                      enumerable: desc.enumerable,
                      configurable: true
                  });
              }
              else {
                  const ref = vue.computed(get.bind(instance));
                  Object.defineProperty(instance, key, {
                      get: () => ref.value,
                      enumerable: desc.enumerable,
                      configurable: true
                  });
              }
          }
      });
  }

  function getValue(value, path) {
      for (let i = 0; i < path.length; i++) {
          const key = path[i];
          if (value == null)
              value = undefined;
          else
              value = value[key];
      }
      return value;
  }
  // 'on.flag:target', 'on.flag1.flag2:target'
  // 'on.deep=1.immediate:target'
  // flags: deep, deep=N, immediate, once, pre, post, sync
  let watchPattern = /^on(\.[.a-zA-Z0-9=]*)?:(.*)$/;
  function isWatch(key) {
      return watchPattern.test(key);
  }
  function parseWatch(key) {
      var _a;
      let match = key.match(watchPattern);
      let flags = (_a = match[1]) !== null && _a !== void 0 ? _a : '';
      let deepMatch = flags.match(/\.deep(?:=(\d+))?/);
      return {
          path: match[2].split('.'),
          options: {
              deep: deepMatch && deepMatch[1] ? parseInt(deepMatch[1]) :
                  deepMatch ? true :
                      undefined,
              immediate: flags.includes('.immediate'),
              once: flags.includes('.once'),
              flush: flags.includes('.pre') ? 'pre'
                  : flags.includes('.post') ? 'post'
                      : flags.includes('.sync') ? 'sync'
                          : undefined
          }
      };
  }
  const warned = new Set();
  const COMPAT_WARN_MSG = `watches on an array value will no longer trigger on array mutation unless the ".deep" flag is \
specified. You can specify the intended behavior and suppress this warning by setting an explicit ".deep" flag:

  "on.deep=0:yourArray"(newValue, oldValue) { // Vue 3 semantics, doesn't trigger on mutation
  "on.deep=1:yourArray"(newValue, oldValue) { // Vue 2 semantics, triggers on mutation

  Details: https://v3-migration.vuejs.org/breaking-changes/watch.html`;
  function warnCompat(className, propertyKey) {
      if (!warned.has(`${className}%${propertyKey}`)) {
          warned.add(`${className}%${propertyKey}`);
          // Same format as the Vue compat build
          let message = '[Vue warn]: (deprecation WATCH_ARRAY @ vue-class-store) ';
          if (warned.size == 1) {
              message += COMPAT_WARN_MSG; // only print the full message once
          }
          else {
              message += `(${warned.size})`;
          }
          message += `\n  at ${className}["${propertyKey}"]`;
          console.warn(message);
      }
  }
  // https://github.com/vuejs/core/pull/12236
  function compatWatch(className, propertyKey, source, callback, options) {
      if (options.deep != undefined) {
          return vue.watch(source, callback, options); // if deep is specified, even `deep: 0`, don't activate the compat
      }
      else {
          return vue.watch(() => {
              const value = source();
              if (Array.isArray(value)) {
                  warnCompat(className, propertyKey);
                  value.slice(0, 0); // establish reactive dependency on array iteration order
                  return { COMPAT_ARRAY_UNWRAP: value };
              }
              return value;
          }, (newValue, oldValue, onCleanup) => {
              if (newValue && newValue.COMPAT_ARRAY_UNWRAP) {
                  newValue = newValue.COMPAT_ARRAY_UNWRAP;
              }
              if (oldValue && oldValue.COMPAT_ARRAY_UNWRAP) {
                  oldValue = oldValue.COMPAT_ARRAY_UNWRAP;
              }
              return callback(newValue, oldValue, onCleanup);
          }, options);
      }
  }
  /**
   * Scans the model for `on:*` watchers and then creates watches for them. This method expects to be passed a reactive
   * model.
   */
  function createWatches(instance, descriptors) {
      getOrAddWatchScope(instance).run(() => {
          descriptors.forEach(([key, desc]) => {
              var _a, _b;
              if (isWatch(key)) {
                  let { path, options } = parseWatch(key);
                  let callback = typeof desc.value === 'string' ? instance[desc.value] : desc.value;
                  if (typeof callback === 'function') {
                      compatWatch((_b = (_a = instance.constructor) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : 'Unknown', key, () => getValue(instance, path), callback.bind(instance), options);
                  }
              }
          });
      });
  }
  /**
   * Used to clean up computed and watches when destroying a store: https://stackoverflow.com/a/74515382
   */
  const vueStoreWatchScope = Symbol("vue-class-store__watchScope");
  function getOrAddWatchScope(instance) {
      var _a;
      return (_a = instance[vueStoreWatchScope]) !== null && _a !== void 0 ? _a : (instance[vueStoreWatchScope] = vue.markRaw(vue.effectScope(true)));
  }
  function destroyWatches(instance) {
      if (instance && instance[vueStoreWatchScope]) {
          instance[vueStoreWatchScope].stop();
          delete instance[vueStoreWatchScope];
      }
  }

  /**
   * Create a store from the given object. The returned value will be a wrapper around the passed model
   */
  function createStore(model) {
      const descriptors = Object.entries(getAllDescriptors(model));
      const reactiveInstance = vue.reactive(model);
      addComputed(reactiveInstance, descriptors);
      createWatches(reactiveInstance, descriptors);
      return reactiveInstance;
  }
  /**
   * Destroy the given store, destroying its computed properties and watches, allowing it to be garbage collected.
   */
  function destroyStore(instance) {
      // computed properties don't need to be cleaned up
      destroyWatches(instance);
  }
  //
  // interface Reactive {
  //   new(): object
  //
  //   <T extends abstract new(...args: any[]) => any>(constructor: T): T
  // }
  /**
   * Extend this class to have your class be reactive. Computed properties will be cached, but `on:foo` watch functions
   * aren't supported. If you need watches, use {@link VueStore}
   */
  // const VueStore: VueStore = function VueStore(this: object, constructor?: { new(...args: any[]): {} }): any {
  //   if (constructor === undefined) { // called as a bare constructor
  //
  class Reactive {
      constructor() {
          const descriptors = Object.entries(getAllDescriptors(Object.getPrototypeOf(this)));
          const reactiveThis = vue.reactive(this);
          // watches require late initialization to work properly, so we only do computed properties
          addComputed(reactiveThis, descriptors);
          return reactiveThis;
      }
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
  const VueStore = function VueStore(constructor) {
      if (constructor === undefined) { // called as a bare constructor
          if (!isDecorated(Object.getPrototypeOf(this))) {
              throw TypeError(`Class ${this.constructor.name} isn't decorated with @VueStore`);
          }
          return vue.reactive(this);
      }
      else { // called as a decorator
          if (isDecorated(constructor.prototype)) // already a VueStore class
              return constructor;
          const descriptors = Object.entries(getAllDescriptors(constructor.prototype));
          const wrapperClass = {
              // preserve the class name. Useful for instanceof checks.
              // https://stackoverflow.com/a/9479081 | https://stackoverflow.com/a/48813707
              [constructor.name]: class extends constructor {
                  constructor(...args) {
                      super(...args);
                      // when instantiating a store, the *topmost* class must be decorated in order for computed properties and
                      // watches to be correctly initialized
                      if (!isDecorated(Object.getPrototypeOf(this))) {
                          throw TypeError(`Class ${this.constructor.name} isn't decorated with @VueStore`);
                      }
                      const reactiveThis = vue.reactive(this);
                      // only the topmost class should handle adding computed/watches
                      if (wrapperClass.prototype === Object.getPrototypeOf(this)) {
                          addComputed(reactiveThis, descriptors);
                          createWatches(reactiveThis, descriptors);
                      }
                      return reactiveThis;
                  }
              }
          }[constructor.name];
          wrapperClass.prototype[vueStoreDecorated] = true;
          return wrapperClass;
      }
  };
  const vueStoreDecorated = Symbol("vue-class-store__decorated");
  function isDecorated(prototype) {
      return Object.hasOwn(prototype, vueStoreDecorated);
  }

  exports.Reactive = Reactive;
  exports.createStore = createStore;
  exports.default = VueStore;
  exports.destroyStore = destroyStore;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
