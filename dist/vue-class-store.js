/**
 * Bundle of: vue-class-store
 * Generated: 2024-11-25
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
  function addComputed(instance, descriptors) {
      descriptors.forEach(([key, desc]) => {
          const { get, set } = desc;
          if (get) {
              let ref = set
                  ? vue.computed({ get: get.bind(instance), set: set.bind(instance) })
                  : vue.computed(get.bind(instance));
              Object.defineProperty(instance, key, {
                  value: ref,
                  writable: desc.writable,
                  enumerable: desc.enumerable,
                  configurable: true
              });
          }
      });
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
  function addWatches(instance, descriptors) {
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
  }
  function addReactivity(instance, descriptors) {
      const reactiveInstance = vue.reactive(instance);
      addComputed(reactiveInstance, descriptors);
      addWatches(reactiveInstance, descriptors);
      return reactiveInstance;
  }
  function createStore(model) {
      return addReactivity(model, Object.entries(getAllDescriptors(model)));
  }
  const Reactive = function Reactive() {
      return vue.reactive(this);
  };
  const vueStoreMetadata = Symbol("@@vueStoreMetadata");
  function getStoreMetadata(prototype) {
      var _a;
      return (_a = Object.getOwnPropertyDescriptor(prototype, vueStoreMetadata)) === null || _a === void 0 ? void 0 : _a.value;
  }
  function setStoreMetadata(prototype, metadata) {
      return prototype[vueStoreMetadata] = metadata;
  }
  function hasStoreFlag(prototype) {
      return getStoreMetadata(prototype) != undefined;
  }
  function findStorePrototype(prototype) {
      while (prototype !== null && prototype !== Object.prototype) {
          if (hasStoreFlag(prototype)) {
              return prototype;
          }
          else {
              prototype = Object.getPrototypeOf(prototype);
          }
      }
      return null;
  }
  const VueStore = function VueStore(constructor) {
      if (constructor === undefined) { // called as a bare constructor
          if (!hasStoreFlag(Object.getPrototypeOf(this))) {
              throw TypeError(`Class ${this.constructor.name} isn't decorated with @VueStore`);
          }
          return vue.reactive(this);
      }
      else { // called as a decorator
          if (hasStoreFlag(constructor.prototype)) // already a VueStore class
              return constructor;
          const wrapper = {
              // preserve the class name. Useful for instanceof checks.
              // https://stackoverflow.com/a/9479081 | https://stackoverflow.com/a/48813707
              [constructor.name]: class extends constructor {
                  constructor(...args) {
                      super(...args);
                      // introspect this class's prototype
                      if (findStorePrototype(Object.getPrototypeOf(this)) === wrapper.prototype) {
                          // if this is the topmost `extends VueStore(Superclass)` or `@VueStore`, add full reactivity
                          // at this point, `this` won't include dynamic keys from subclasses
                          return addReactivity(this, Object.entries(getAllDescriptors(Object.getPrototypeOf(this))));
                      }
                      else {
                          // otherwise, make it a reactive instance, but don't apply any watches or computed properties
                          // the topmost VueStore decorator is responsible
                          return vue.reactive(this);
                      }
                  }
              }
          }[constructor.name];
          setStoreMetadata(wrapper.prototype, {});
          return wrapper;
      }
  };

  exports.Reactive = Reactive;
  exports.createStore = createStore;
  exports.default = VueStore;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
