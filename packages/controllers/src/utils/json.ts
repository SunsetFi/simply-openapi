import { isPlainObject } from "lodash";

export function isJSONSerializable(x: any): boolean {
  if (x === undefined) {
    return false;
  }

  if (x == null) {
    return true;
  }

  if (Array.isArray(x)) {
    // Undefined as array elements stringify into  null.
    return x.every((x) => x === undefined || isJSONSerializable(x));
  }

  if (typeof x === "object") {
    if (!isPlainObject(x)) {
      // We can serialize an object if it has a toJSON method.
      return typeof x.toJSON === "function";
    }

    // Undefined as values are dropped from the object when stringifying.
    return Object.values(x).every(
      (x) => x === undefined || isJSONSerializable(x),
    );
  }

  return (
    typeof x === "string" || typeof x === "number" || typeof x === "boolean"
  );
}
