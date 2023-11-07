import { OpenAPIObject } from "openapi3-ts/dist/oas31";

export function stripSECExtensions(schema: OpenAPIObject): OpenAPIObject {
  return stripSECExtensionsDeep(schema);
}

function stripSECExtensionsDeep<T extends object | any[]>(object: T): T {
  if (Array.isArray(object)) {
    return object.map(stripSECExtensionsDeep) as T;
  }

  return Object.entries(object).reduce((acc, [key, value]) => {
    if (key.startsWith("x-sec-")) {
      return acc;
    }

    if (Array.isArray(value)) {
      return {
        ...acc,
        [key]: value.map(stripSECExtensionsDeep),
      };
    } else if (typeof value === "object") {
      return {
        ...acc,
        [key]: stripSECExtensionsDeep(value),
      };
    } else {
      return {
        ...acc,
        [key]: value,
      };
    }
  }, {} as T);
}
