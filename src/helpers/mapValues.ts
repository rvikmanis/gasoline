export type Mapper<T, K, V> = (item: T, key: K) => V

export function mapValues<
  V,
  C extends { [key: string]: any }
>(
  collection: C,
  mapper: (item: C[keyof C], key: keyof C) => V
): { [K in keyof C]: V } {

  if (typeof collection === 'object' && collection != null) {
    const result: any = {}
    Object.keys(collection).forEach(k => {
      result[k] = mapper(collection[k], k)
    })
    return result
  }

  throw new TypeError('Invalid collection type')

}
