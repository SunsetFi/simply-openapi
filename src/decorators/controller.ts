import { OpenAPIObject } from "openapi3-ts/oas31";

import { mergeSOCControllerMetadata } from "../metadata";

export interface ControllerOptions {
  tags?: string[];
}

export function Controller(path?: string, opts?: ControllerOptions) {
  return function (target: any) {
    mergeSOCControllerMetadata(target, { path, tags: opts?.tags });
  };
}

export function OpenAPI(fragment: Partial<OpenAPIObject>) {
  return function (target: any) {
    mergeSOCControllerMetadata(target, { openapiFragment: fragment });
  };
}
