export declare function createStore<T extends object>(model: T): T;
export declare const Reactive: new () => object;
interface VueStore {
    new (): object;
    <T extends abstract new (...args: any[]) => any>(constructor: T): T;
}
declare const VueStore: VueStore;
export default VueStore;
