import Ptr from "@json-schema-spec/json-pointer";
import {
  OpenAPIObject,
  ReferenceObject,
  PathItemObject,
} from "openapi3-ts/oas31";
import { JsonValue } from "type-fest";

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
  let currentObj = instance;
  do {
    for (const propertyName of [
      ...Object.getOwnPropertyNames(currentObj),
      ...Object.getOwnPropertySymbols(currentObj),
    ]) {
      const value = (instance as any)[propertyName];
      if (typeof value === "function") {
        methods.push(value);
      }
    }
  } while ((currentObj = Object.getPrototypeOf(currentObj)));

  return methods;
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

export function isNotNull<T>(x: T | null): x is T {
  return x !== null;
}
