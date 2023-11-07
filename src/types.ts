import { PathItemObject } from "openapi3-ts/dist/model/openapi30";
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

export type RequestMethod = (typeof requestMethods)[number];

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
