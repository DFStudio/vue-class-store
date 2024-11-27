import {computed} from 'vue'

export function addComputed(instance: object, descriptors: [string, PropertyDescriptor][]) {
  descriptors.forEach(([key, desc]) => {
    const {get, set} = desc
    if (get) {
      let ref = set
          ? computed({get: get.bind(instance), set: set.bind(instance)})
          : computed(get.bind(instance))

      Object.defineProperty(instance, key, {
        value: ref, // vue unwraps this Ref automatically when accessing it
        writable: desc.writable,
        enumerable: desc.enumerable,
        configurable: true
      })
    }
  })
}
