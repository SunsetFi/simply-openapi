import {
  OpenAPIObject,
  PathItemObject,
  OperationObject,
  ReferenceObject,
} from "openapi3-ts/oas31";
import Ptr from "@json-schema-spec/json-pointer";
import { pick } from "lodash";

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

export function resolveReference<T extends object>(
  spec: OpenAPIObject,
  value: T | ReferenceObject,
): T {
  if ("$ref" in value) {
    if (!value["$ref"].startsWith("#")) {
      throw new Error(
        `Cannot resolve external reference "${value["$ref"]}" in the OpenAPI schema.`,
      );
    }
    const ptr = Ptr.parse(value["$ref"].substring(1));
    return ptr.eval(spec);
  }

  return value;
}

export function getOperationsByKey(
  spec: OpenAPIObject,
): Record<string, OperationObject> {
  const ops: Record<string, OperationObject> = {};
  for (const [path, data] of Object.entries(spec.paths ?? {})) {
    const resolvedData = resolveReference(spec, data);
    const operations = pick(resolvedData, requestMethods);
    for (const [method, operation] of Object.entries(operations)) {
      ops[operation.operationId ?? `${method} ${path}`] = operation;
    }
  }

  return ops;
}
