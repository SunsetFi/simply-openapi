export function isNotNullOrUndefined<T>(x: T | null | undefined): x is T {
  return x !== null;
}

export function isConstructor(object: object): boolean {
  const prototype = (object as any).prototype;
  return prototype && prototype.constructor === object;
}
