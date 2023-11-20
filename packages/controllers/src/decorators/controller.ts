import { OpenAPIObject } from "openapi3-ts/oas31";

import {
  getSOCControllerMetadata,
  mergeSOCControllerMetadata,
} from "../metadata";
import { expressToOpenAPIPath } from "../urls";

export interface ControllerOptions {
  tags?: string[];
}

export function Controller(path?: string, opts?: ControllerOptions) {
  return function (target: any) {
    if (getSOCControllerMetadata(target)?.type === "bound") {
      throw new Error(
        `Controller ${target.name} cannot be both a bound controller and a custom controller.`,
      );
    }

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

export function BoundController(opts?: ControllerOptions) {
  return function (target: any) {
    if (getSOCControllerMetadata(target)?.type === "custom") {
      throw new Error(
        `Controller ${target.name} cannot be both a bound controller and a custom controller.`,
      );
    }

    mergeSOCControllerMetadata(target, { type: "bound" });
  };
}

export function OpenAPI(fragment: Partial<OpenAPIObject>) {
  return function (target: any, propertyKey?: string | symbol) {
    // propertyKey intentionally left unused.  This decorator always adds fragments to the controller.
    mergeSOCControllerMetadata(target, { openapiFragment: fragment });
  };
}
