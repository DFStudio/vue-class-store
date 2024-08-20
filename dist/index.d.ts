type Constructor<T> = new (...args: any[]) => T;
export declare function makeReactive<T extends object>(model: T): T;
export interface VueStore {
    new (): object;
    <T extends Constructor<any>>(constructor: T): T;
    create<T extends object>(model: T): T;
}
declare const VueStore: VueStore;
export default VueStore;
