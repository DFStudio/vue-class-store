import {computed} from 'vue'

export function addComputed(instance: object, descriptors: [string, PropertyDescriptor][]) {
  descriptors.forEach(([key, desc]) => {
    const {get, set} = desc
    if (get) {
      // We *could* just set `value: ref` in the descriptor and Vue will automatically unwrap the ref, however that
      // causes errors if the object is passed through `Object.freeze()`, since the underlying value is a ref, but the
      // proxy returns a different value: https://github.com/vuejs/core/issues/3024
      if (set) {
        const ref = computed({get: get.bind(instance), set: set.bind(instance)})
        Object.defineProperty(instance, key, {
          get: () => ref.value,
          set: (v) => ref.value = v,
          enumerable: desc.enumerable,
          configurable: true
        })
      } else {
        const ref = computed(get.bind(instance))
        Object.defineProperty(instance, key, {
          get: () => ref.value,
          enumerable: desc.enumerable,
          configurable: true
        })
      }
    }
  })
}
