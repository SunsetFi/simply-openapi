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

      if (Array.isArray(value)) {
        return {
          ...acc,
          [key]: value.map(stripSOCExtensionsDeep),
        };
      } else if (typeof value === "object") {
        return {
          ...acc,
          [key]: stripSOCExtensionsDeep(value),
        };
      } else {
        return {
          ...acc,
          [key]: value,
        };
      }
    }, {} as T);
  }

  return object;
}
