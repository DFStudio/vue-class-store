/**
 * Bundle of: vue-class-store
 * Generated: 2024-08-26
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
  // flags: deep, immediate, pre, post, sync
  let watchPattern = /^on(\.[.a-zA-Z]*)?:(.*)$/;
  function isWatch(key) {
      return watchPattern.test(key);
  }
  function parseWatch(key) {
      var _a;
      let match = key.match(watchPattern);
      let flags = (_a = match[1]) !== null && _a !== void 0 ? _a : '';
      return {
          path: match[2].split('.'),
          options: {
              deep: flags.includes('.deep'),
              immediate: flags.includes('.immediate'),
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
  /**
   * Scans the model for `on:*` watchers and then creates watches for them. This method expects to be passed a reactive
   * model.
   */
  function addWatches(instance, descriptors) {
      descriptors.forEach(([key, desc]) => {
          if (isWatch(key)) {
              let { path, options } = parseWatch(key);
              let callback = typeof desc.value === 'string' ? instance[desc.value] : desc.value;
              if (typeof callback === 'function') {
                  vue.watch(() => getValue(instance, path), callback.bind(instance), options);
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

  exports.createStore = createStore;
  exports.default = VueStore;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
