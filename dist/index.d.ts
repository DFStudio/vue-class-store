export declare function createStore<T extends object>(model: T): T;
interface VueStore {
    new (): object;
    <T extends abstract new (...args: any[]) => any>(constructor: T): T;
}
declare const VueStore: VueStore;
export default VueStore;
