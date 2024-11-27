export function getAllDescriptors(model: object | null): Record<string, PropertyDescriptor> {
  if (model === null || model === Object.prototype) {
    return {}
  }
  const descriptors = Object.getOwnPropertyDescriptors(model)
  const parentDescriptors = getAllDescriptors(Object.getPrototypeOf(model))
  return {...parentDescriptors, ...descriptors}
}

