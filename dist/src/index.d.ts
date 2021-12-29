declare type C = {
    new (...args: any[]): {};
};
declare type R = Record<any, any>;
declare function makeVue<T extends R>(instance: T): T;
declare function VueStore<T extends C>(constructor: T): T;
declare namespace VueStore {
    var create: typeof makeVue;
}
export default VueStore;
