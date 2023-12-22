import { OpenAPIObject } from "openapi3-ts/oas31";

export function stripSOCExtensions(schema: OpenAPIObject): OpenAPIObject {
  return stripSOCExtensionsDeep(schema);
}

function stripSOCExtensionsDeep<T extends object | any[]>(object: T): T {
  if (object == null) {
    return object;
  }

  if (Array.isArray(object)) {
    return object.map(stripSOCExtensionsDeep) as T;
  }

  if (typeof object === "object") {
    return Object.entries(object).reduce((acc, [key, value]) => {
      if (key.startsWith("x-simply-")) {
        return acc;
      }

      (acc as any)[key] = stripSOCExtensionsDeep(value);
      return acc;
    }, {} as T);
  }

  return object;
}
