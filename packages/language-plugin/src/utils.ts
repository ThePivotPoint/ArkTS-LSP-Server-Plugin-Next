const SYMBOL_UNINITIALIZED = Symbol('UNINITIALIZED')

/**
 * Store a lazy getter function, and return the cached value.
 *
 * When first time calling the returned function, the lazy getter function will be executed,
 * and the result will be cached.
 *
 * When second time calling the returned function, the cached value will be returned and the lazy getter function will not be executed again.
 *
 * @param fn - The lazy getter function.
 * @returns The cached value.
 */
export function createLazyGetter<T>(fn: () => T): () => T {
  let value: T | typeof SYMBOL_UNINITIALIZED = SYMBOL_UNINITIALIZED

  return () => {
    if (value === SYMBOL_UNINITIALIZED)
      value = fn()
    return value
  }
}
