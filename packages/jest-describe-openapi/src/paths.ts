import { OpenAPIObject, PathItemObject, PathsObject } from "openapi3-ts/oas31";
import { pick, upperCase } from "lodash";

import { requestMethods, resolveReference } from "./utils";
import { describeOperationSnapshots } from "./operation";

export function describePathsSnapshots(spec: OpenAPIObject): void;
export function describePathsSnapshots(
  paths: PathsObject,
  spec: OpenAPIObject,
): void;
export function describePathsSnapshots(
  pathsOrSpec: PathsObject | OpenAPIObject,
  spec?: OpenAPIObject,
): void {
  const paths = spec ? pathsOrSpec : (pathsOrSpec as OpenAPIObject).paths;
  spec = spec ?? (pathsOrSpec as OpenAPIObject);
  if (!paths) {
    return;
  }

  for (const [path, pathItem] of Object.entries(paths)) {
    describePathSnapshots(path, pathItem, spec);
  }
}

export function describePathSnapshots(
  path: string,
  pathItem: PathItemObject,
  spec: OpenAPIObject,
) {
  pathItem = resolveReference(spec, pathItem);

  const operations = pick(pathItem, requestMethods);
  for (const [method, operation] of Object.entries(operations)) {
    let describeName = `${upperCase(method)} ${path}`;
    if (operation.operationId) {
      describeName += ` (${operation.operationId})`;
    }

    describe(describeName, function () {
      describeOperationSnapshots(operation, spec);
    });
  }
}
