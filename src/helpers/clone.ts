export function clone<
    T extends { [key: string]: any }
>(obj: T): T {
    const keys = Object.keys(obj);
    const target = {} as T;
    const length = keys.length;

    let i = -1;
    while(++i < length) {
      var k = keys[i]
      target[k] = obj[k]
    }

    return target;
}