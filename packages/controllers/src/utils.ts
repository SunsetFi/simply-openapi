import { PathItemObject, SecurityRequirementObject } from "openapi3-ts/oas31";
import { isPlainObject, uniq } from "lodash";
import { mergeWith as mergeWithFp } from "lodash/fp";

import { ControllerObject } from "./types";

export const requestMethods = [
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
] as const satisfies readonly (keyof PathItemObject)[];

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

// Javascript throws TypeErrors if we try to access certain properties.
const forbiddenProperties: (string | symbol)[] = [
  "constructor",
  "prototype",
  "caller",
  "callee",
  "arguments",
];
export function getClassMethods(object: object): [string | symbol, Function][] {
  const methods: [string | symbol, Function][] = [];

  function scanObject(obj: object) {
    do {
      for (const propertyName of [
        ...Object.getOwnPropertyNames(obj),
        ...Object.getOwnPropertySymbols(obj),
      ]) {
        if (forbiddenProperties.includes(propertyName)) {
          continue;
        }
        const value = (obj as any)[propertyName];
        if (typeof value === "function") {
          methods.push([propertyName, value]);
        }
      }
    } while ((obj = Object.getPrototypeOf(obj)));
  }

  const prototype = (object as any).prototype;
  if (prototype && prototype.constructor === object) {
    // This is a class constructor
    scanObject(prototype);
  } else if (object.constructor) {
    // This is an instance
    scanObject(object);
  } else {
    // No idea what this is
    scanObject(object);
  }

  return methods;
}

/**
 * Scans through both prototypes (for functions for constructors) and the object prototype stack (for live instances)
 */
export function scanObjectChain(
  obj: object,
  scanner: (instance: object) => boolean | void,
) {
  function scanFrom(
    obj: object,
    getPrototype: (obj: object) => object | null | undefined,
  ) {
    let currentObj: object | null | undefined = obj;
    do {
      if (scanner(currentObj) === false) {
        return false;
      }
    } while ((currentObj = getPrototype(currentObj)));
    return true;
  }

  if (scanner(obj) === false) {
    return;
  }

  if (!scanFrom(obj, Object.getPrototypeOf)) {
    return;
  }

  scanFrom(obj, (obj: any) => obj.prototype);
}

export function scanObjectProperties(
  obj: object,
  scanner: (
    instance: object,
    key: string | symbol,
    value: any,
  ) => boolean | void,
) {
  scanObjectChain(obj, (obj) => {
    for (const propertyName of [
      ...Object.getOwnPropertyNames(obj),
      ...Object.getOwnPropertySymbols(obj),
    ]) {
      if (forbiddenProperties.includes(propertyName)) {
        continue;
      }
      const value = (obj as any)[propertyName];
      if (scanner(obj, propertyName, value) === false) {
        return false;
      }
    }
  });
}

export function nameController(controller: ControllerObject) {
  return (controller as any).name ?? controller.constructor.name;
}

export function isNotNullOrUndefined<T>(x: T | null | undefined): x is T {
  return x !== null;
}

export function isConstructor(object: object): boolean {
  const prototype = (object as any).prototype;
  return prototype && prototype.constructor === object;
}

export function mergeCombineArrays(object: any, ...sources: any[]) {
  for (const source of sources) {
    object = mergeWithFp(
      (objValue, srcValue): any => {
        if (Array.isArray(objValue)) {
          return objValue.concat(srcValue);
        }
      },
      object,
      source,
    );
  }

  return object;
}

export function mergeSecurityReqs(
  target: SecurityRequirementObject[],
  sources: SecurityRequirementObject[],
) {
  target = target.slice();
  for (const source of sources) {
    const mergeIntoIndex: number = target.findIndex((s) => {
      const sKeys = Object.keys(s);
      const secKeys = Object.keys(source);
      return (
        sKeys.length === secKeys.length &&
        sKeys.every((k) => secKeys.includes(k))
      );
    });
    if (mergeIntoIndex >= 0) {
      target[mergeIntoIndex] = mergeWithFp(
        (objValue, srcValue): any => {
          if (Array.isArray(objValue)) {
            return uniq(objValue.concat(srcValue));
          }
        },
        target[mergeIntoIndex],
        source,
      );
    } else {
      target.push(source);
    }
  }

  return target;
}
