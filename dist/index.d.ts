/**
 * Create a store from the given object. The returned value will be a wrapper around the passed model
 */
export declare function createStore<T extends object>(model: T): T;
/**
 * Destroy the given store, destroying its computed properties and watches, allowing it to be garbage collected.
 */
export declare function destroyStore(instance: object): void;
/**
 * Extend this class to have your class be reactive. Computed properties will be cached, but `on:foo` watch functions
 * aren't supported. If you need watches, use {@link VueStore}
 */
export declare class Reactive {
    constructor();
}
interface VueStore {
    new (): object;
    <T extends abstract new (...args: any[]) => any>(constructor: T): T;
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
declare const VueStore: VueStore;
export default VueStore;
