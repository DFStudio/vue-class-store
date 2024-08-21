/**
 * Bundle of: vue-class-store
 * Generated: 2024-08-21
 * Version: 3.0.0
 */

import { reactive, computed, watch } from 'vue';

function getAllDescriptors(model) {
    if (model === null || model === Object.prototype) {
        return {};
    }
    var descriptors = Object.getOwnPropertyDescriptors(model);
    var parentDescriptors = getAllDescriptors(Object.getPrototypeOf(model));
    return Object.assign(Object.assign({}, parentDescriptors), descriptors);
}
function getValue(value, path) {
    for (var i = 0; i < path.length; i++) {
        var key = path[i];
        if (value == null)
            { value = undefined; }
        else
            { value = value[key]; }
    }
    return value;
}
// 'on.flag:target', 'on.flag1.flag2:target'
// flags: deep, immediate, pre, post, sync
var watchPattern = /^on(\.[.a-zA-Z]*)?:(.*)$/;
function isWatch(key) {
    return watchPattern.test(key);
}
function parseWatch(key) {
    var _a;
    var match = key.match(watchPattern);
    var flags = (_a = match[1]) !== null && _a !== void 0 ? _a : '';
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
    descriptors.forEach(function (ref) {
        var key = ref[0];
        var desc = ref[1];

        var get = desc.get;
        var set = desc.set;
        if (get) {
            var ref$1 = set
                ? computed({ get: get.bind(instance), set: set.bind(instance) })
                : computed(get.bind(instance));
            Object.defineProperty(instance, key, {
                value: ref$1,
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
    descriptors.forEach(function (ref) {
        var key = ref[0];
        var desc = ref[1];

        if (isWatch(key)) {
            var ref$1 = parseWatch(key);
            var path = ref$1.path;
            var options = ref$1.options;
            var callback = typeof desc.value === 'string' ? instance[desc.value] : desc.value;
            if (typeof callback === 'function') {
                watch(function () { return getValue(instance, path); }, callback.bind(instance), options);
            }
        }
    });
}
function addReactivity(instance, descriptors) {
    var reactiveInstance = reactive(instance);
    addComputed(reactiveInstance, descriptors);
    addWatches(reactiveInstance, descriptors);
    return reactiveInstance;
}
function createStore(model) {
    return addReactivity(model, Object.entries(getAllDescriptors(model)));
}
var vueStoreMetadata = Symbol("@@vueStoreMetadata");
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
var VueStore = function VueStore(constructor) {
    var obj;

    if (constructor === undefined) { // called as a bare constructor
        if (!hasStoreFlag(Object.getPrototypeOf(this))) {
            throw TypeError(("Class " + (this.constructor.name) + " isn't decorated with @VueStore"));
        }
        return reactive(this);
    }
    else { // called as a decorator
        if (hasStoreFlag(constructor.prototype)) // already a VueStore class
            { return constructor; }
        var wrapper = ( obj = {}, obj[constructor.name] = /*@__PURE__*/(function (constructor) {
            function anonymous() {
                    var args = [], len = arguments.length;
                    while ( len-- ) args[ len ] = arguments[ len ];

                    constructor.apply(this, args);
                    // introspect this class's prototype
                    if (findStorePrototype(Object.getPrototypeOf(this)) === wrapper.prototype) {
                        // if this is the topmost `extends VueStore(Superclass)` or `@VueStore`, add full reactivity
                        // at this point, `this` won't include dynamic keys from subclasses
                        return addReactivity(this, Object.entries(getAllDescriptors(Object.getPrototypeOf(this))));
                    }
                    else {
                        // otherwise, make it a reactive instance, but don't apply any watches or computed properties
                        // the topmost VueStore decorator is responsible
                        return reactive(this);
                    }
                }

            if ( constructor ) anonymous.__proto__ = constructor;
            anonymous.prototype = Object.create( constructor && constructor.prototype );
            anonymous.prototype.constructor = anonymous;

            return anonymous;
        }(constructor)), obj )[constructor.name];
        setStoreMetadata(wrapper.prototype, {});
        return wrapper;
    }
};

export default VueStore;
export { createStore };
