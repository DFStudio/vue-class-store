/**
 * Bundle of: vue-class-store
 * Generated: 2021-12-29
 * Version: 2.0.6
 */

import Vue from 'vue';

function injectVue(prototype) {
    var descriptors = Object.getOwnPropertyDescriptors(Vue.prototype);
    delete descriptors['constructor'];
    Object.defineProperties(prototype, descriptors);
}
// 'on.flag:target', 'on.flag1.flag2:target'
// flags: deep, immediate, pre, post, sync
var watchPattern = /^on(\.[.a-zA-Z]*)?:(.*)$/;
function isWatch(key) {
    return watchPattern.test(key);
}
function createWatcher(name, handler) {
    var _a;
    var match = name.match(watchPattern);
    // the initial period will create an empty element, but all we do is check if specific values exist, so we don't care
    var flags = new Set(((_a = match[1]) !== null && _a !== void 0 ? _a : '').split('.'));
    var target = match[2];
    return {
        name: target,
        watcher: {
            handler: handler,
            deep: flags.has('deep'),
            immediate: flags.has('immediate')
        }
    };
}
/**
 * Collects all the "static" options for the given prototype. That includes:
 * - watch methods (only methods. string watches like `'on:thing' = 'name'` wind up in the instance, not the prototype)
 * - computed property getters and setters
 */
function collectClassOptions(prototype) {
    if (!prototype || prototype === Object.prototype) {
        return {};
    }
    var extendsOptions = collectClassOptions(Object.getPrototypeOf(prototype));
    var descriptors = Object.getOwnPropertyDescriptors(prototype);
    var name = prototype.constructor.name;
    var computed = {};
    var watch = {};
    Object.keys(descriptors).forEach(function (key) {
        if (key !== 'constructor' && !key.startsWith('__')) {
            var ref = descriptors[key];
            var value = ref.value;
            var get = ref.get;
            var set = ref.set;
            if (isWatch(key)) {
                var ref$1 = createWatcher(key, value);
                var name = ref$1.name;
                var watcher = ref$1.watcher;
                watch[name] = watcher;
            }
            else if (get && set) {
                computed[key] = { get: get, set: set };
            }
            else if (get) {
                computed[key] = get;
            }
        }
    });
    return {
        name: name,
        extends: extendsOptions,
        beforeCreate: prototype.beforeCreate,
        created: prototype.created,
        computed: computed,
        methods: {},
        watch: watch,
    };
}
/**
 * Extracts the data and string watches from the passed instance. This _extracts_ the data, leaving the object empty at
 * the end.
 */
function extractData(instance) {
    var data = {};
    var watch = {};
    // extract the data and watches from the object. Emphasis on _extract_.
    // We _remove_ the data, then give it to vue, which puts it back.
    Object.keys(instance).forEach(function (key) {
        var value = instance[key];
        if (key.startsWith('on:')) {
            var ref = createWatcher(key, value);
            var name = ref.name;
            var watcher = ref.watcher;
            watch[name] = watcher;
        }
        else {
            data[key] = value;
        }
        delete instance[key];
    });
    return { data: data, watch: watch };
}
function mergeData(options, data) {
    return Object.assign(Object.assign({}, options), { watch: Object.assign(Object.assign({}, options.watch), data.watch), data: data.data });
}
function makeVue(instance) {
    var prototype = Object.getPrototypeOf(instance);
    var classOptions = collectClassOptions(prototype);
    // wrap the prototype so we don't modify the base class
    var wrapper = {};
    Object.setPrototypeOf(wrapper, prototype);
    Object.setPrototypeOf(instance, wrapper);
    injectVue(wrapper);
    var data = extractData(instance);
    instance._init(mergeData(classOptions, data));
    return instance;
}
function VueStore(constructor) {
    var obj;

    var classOptions = collectClassOptions(constructor.prototype);
    injectVue(constructor.prototype);
    var wrapper = ( obj = {}, obj[constructor.name] = function () {
            var args = [], len = arguments.length;
            while ( len-- ) args[ len ] = arguments[ len ];

            var instance = new (Function.prototype.bind.apply( constructor, [ null ].concat( args) ));
            var data = extractData(instance);
            instance._init(mergeData(classOptions, data));
            return instance;
        }, obj )[constructor.name];
    // set the wrapper's `prototype` property to the wrapped class's prototype. This makes instanceof work.
    wrapper.prototype = constructor.prototype;
    // set the prototype to the constructor instance so you can still access static methods/properties.
    // This is how JS implements inheriting statics from superclasses, so it seems like a good solution.
    Object.setPrototypeOf(wrapper, constructor);
    return wrapper;
}
VueStore.create = makeVue;

export { VueStore as default };
