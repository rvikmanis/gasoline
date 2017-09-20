import { Dict } from '../interfaces'

export type Mapper<T, V> = (item: T) => V

export default function mapValues<T extends C[keyof C], V, C extends Dict<any>>(
  collection: C,
  mapper: Mapper<T, V>
): {[K in keyof C]: V } {
  if (typeof collection === 'object' && collection != null) {
    const result: any = {}
    Object.keys(collection).forEach(k => {
      result[k] = mapper(collection[k])
    })
    return result
  }

  throw new TypeError('Invalid collection type')
}
