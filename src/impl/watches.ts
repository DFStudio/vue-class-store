import {watch, WatchCallback, WatchHandle, WatchOptions} from 'vue'

function getValue(value: Record<any, any> | null | undefined, path: string[]) {
  for (let i = 0; i < path.length; i++){
    const key = path[i];
    if (value == null)
      value = undefined
    else
      value = value[key]
  }
  return value
}

// 'on.flag:target', 'on.flag1.flag2:target'
// 'on.deep=1.immediate:target'
// flags: deep, deep=N, immediate, once, pre, post, sync
let watchPattern = /^on(\.[.a-zA-Z0-9=]*)?:(.*)$/

function isWatch(key: string): boolean {
  return watchPattern.test(key)
}

type WatchDefinition = { path: string[], options: WatchOptions }

function parseWatch(key: string): WatchDefinition {
  let match = key.match(watchPattern)!
  let flags = match[1] ?? ''
  let deepMatch = flags.match(/\.deep(?:=(\d+))?/)
  return {
    path: match[2].split('.'),
    options: {
      deep:
          deepMatch && deepMatch[1] ? parseInt(deepMatch[1]) :
              deepMatch ? true :
                  undefined,
      immediate: flags.includes('.immediate'),
      once: flags.includes('.once'),
      flush:
          flags.includes('.pre') ? 'pre'
              : flags.includes('.post') ? 'post'
                  : flags.includes('.sync') ? 'sync'
                      : undefined
    }
  }
}

const warned = new Set<string>()
const COMPAT_WARN_MSG = `watches on an array value will no longer trigger on array mutation unless the ".deep" flag is \
specified. You can specify the intended behavior and suppress this warning by setting an explicit ".deep" flag:

  "on.deep=0:yourArray"(newValue, oldValue) { // Vue 3 semantics, doesn't trigger on mutation
  "on.deep=1:yourArray"(newValue, oldValue) { // Vue 2 semantics, triggers on mutation

  Details: https://v3-migration.vuejs.org/breaking-changes/watch.html`

function warnCompat(className: string, propertyKey: string) {
  if (!warned.has(`${className}%${propertyKey}`)) {
    warned.add(`${className}%${propertyKey}`)

    // Same format as the Vue compat build
    let message = '[Vue warn]: (deprecation WATCH_ARRAY @ vue-class-store) '
    if (warned.size == 1) {
      message += COMPAT_WARN_MSG // only print the full message once
    } else {
      message += `(${warned.size})`
    }
    message += `\n  at ${className}["${propertyKey}"]`

    console.warn(message)
  }
}

// https://github.com/vuejs/core/pull/12236
function compatWatch(className: string, propertyKey: string, source: () => any, callback: WatchCallback, options: WatchOptions): WatchHandle {
  if (options.deep != undefined) {
    return watch(source, callback, options) // if deep is specified, even `deep: 0`, don't activate the compat
  } else {
    return watch(() => {
      const value = source()
      if (Array.isArray(value)) {
        warnCompat(className, propertyKey)
        value.slice(0, 0) // establish reactive dependency on array iteration order
        return {COMPAT_ARRAY_UNWRAP: value}
      }
      return value
    }, (newValue, oldValue, onCleanup) => {
      if (newValue && newValue.COMPAT_ARRAY_UNWRAP) {
        newValue = newValue.COMPAT_ARRAY_UNWRAP
      }
      if (oldValue && oldValue.COMPAT_ARRAY_UNWRAP) {
        oldValue = oldValue.COMPAT_ARRAY_UNWRAP
      }

      return callback(newValue, oldValue, onCleanup)
    }, options)
  }
}

/**
 * Scans the model for `on:*` watchers and then creates watches for them. This method expects to be passed a reactive
 * model.
 */
export function createWatches(instance: object, descriptors: [string, PropertyDescriptor][]) {
  descriptors.forEach(([key, desc]) => {
    if (isWatch(key)) {
      let {path, options} = parseWatch(key)
      let callback = typeof desc.value === 'string' ? instance[desc.value] : desc.value
      if (typeof callback === 'function') {
        compatWatch(
            instance.constructor?.name ?? 'Unknown', key,
            () => getValue(instance, path),
            callback.bind(instance),
            options
        )
      }
    }
  })
}
