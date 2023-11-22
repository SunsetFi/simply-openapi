import { OpenAPIObject } from "openapi3-ts/oas31";

import { mergeSOCControllerMetadata } from "../metadata";
import { expressToOpenAPIPath } from "../urls";

import { ensureAtMostOneController } from "./utils";

export interface ControllerOptions {
  tags?: string[];
}

export function Controller(path?: string, opts?: ControllerOptions) {
  return function (target: any) {
    ensureAtMostOneController(target);

    if (path) {
      path = expressToOpenAPIPath(path);
    }

    mergeSOCControllerMetadata(target, {
      type: "custom",
      path,
      tags: opts?.tags,
    });
  };
}

export function BoundController() {
  return function (target: any) {
    ensureAtMostOneController(target);

    mergeSOCControllerMetadata(target, { type: "bound" });
  };
}

export function OpenAPI(fragment: Partial<OpenAPIObject>) {
  return function (target: any, propertyKey?: string | symbol) {
    // propertyKey intentionally left unused.  This decorator always adds fragments to the controller.
    mergeSOCControllerMetadata(target, { openapiFragment: fragment });
  };
}
