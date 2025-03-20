import {computed} from 'vue'

export function addComputed(instance: object, descriptors: [string, PropertyDescriptor][]) {
  descriptors.forEach(([key, desc]) => {
    const {get, set} = desc
    if (get) {
      const ref =
          set ? computed({get: get.bind(instance), set: set.bind(instance)})
              : computed(get.bind(instance))

      Object.defineProperty(instance, key, {
        value: ref,
        enumerable: desc.enumerable,
        configurable: true
      })
    }
  })
}
