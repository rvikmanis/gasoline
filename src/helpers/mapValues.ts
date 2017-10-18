import { Dict } from '../interfaces'

export type Mapper<T, K, V> = (item: T, key: K) => V

export function mapValues<T extends C[keyof C], V, C extends Dict<any>>(
  collection: C,
  mapper: Mapper<T, keyof C, V>
): {[K in keyof C]: V } {
  if (typeof collection === 'object' && collection != null) {
    const result: any = {}
    Object.keys(collection).forEach(k => {
      result[k] = mapper(collection[k], k)
    })
    return result
  }

  throw new TypeError('Invalid collection type')
}
