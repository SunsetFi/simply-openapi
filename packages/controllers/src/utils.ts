import Ptr from "@json-schema-spec/json-pointer";
import {
  OpenAPIObject,
  ReferenceObject,
  PathItemObject,
} from "openapi3-ts/oas31";
import { JsonValue } from "type-fest";
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

export function isJson(x: any): x is JsonValue {
  if (x == null) {
    return true;
  }

  if (Array.isArray(x)) {
    return x.every(isJson);
  }
  if (typeof x === "object") {
    return Object.values(x).every(isJson);
  }

  return (
    typeof x === "string" || typeof x === "number" || typeof x === "boolean"
  );
}

export function getInstanceMethods(instance: object) {
  const methods: Function[] = [];
  scanObjectProperties(instance, (instance, key, value) => {
    if (typeof value === "function") {
      methods.push(value);
    }
  });

  return methods;
}

// Javascript throws TypeErrors if we try to access certain properties.
const forbiddenProperties: (string | symbol)[] = [
  "constructor",
  "prototype",
  "caller",
  "callee",
  "arguments",
];

/**
 * Scans through both prototypes (for functions for constructors) and the object prototype stack (for live instances)
 */
export function scanObjectChain(
  obj: object,
  scanner: (instance: object) => boolean | void
) {
  function scanFrom(
    obj: object,
    getPrototype: (obj: object) => object | null | undefined
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
    value: any
  ) => boolean | void
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

export function resolveReference<T extends object>(
  spec: OpenAPIObject,
  value: T | ReferenceObject
): T | null {
  if ("$ref" in value) {
    if (!value["$ref"].startsWith("#")) {
      throw new Error(
        `Cannot resolve external reference "${value["$ref"]}" in the OpenAPI schema.`
      );
    }
    const ptr = Ptr.parse(value["$ref"].substring(1));
    try {
      return ptr.eval(spec);
    } catch {
      return null;
    }
  }

  return value;
}

export function nameController(controller: ControllerObject) {
  return (controller as any).name ?? controller.constructor.name;
}

export function isNotNull<T>(x: T | null): x is T {
  return x !== null;
}
