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
    const metadata = getSOCControllerMetadata(target);

    if (metadata?.type) {
      if (metadata?.type !== "custom") {
        throw new Error(
          `Controller ${target.name} cannot be both a bound controller and a custom controller.`,
        );
      }

      throw new Error(
        `Controller ${target.name} cannot have multiple @Controller or @BoundController decorators.`,
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

export function BoundController() {
  return function (target: any) {
    const metadata = getSOCControllerMetadata(target);
    if (metadata?.type) {
      if (metadata?.type !== "bound") {
        throw new Error(
          `Controller ${target.name} cannot be both a bound controller and a custom controller.`,
        );
      }

      throw new Error(
        `Controller ${target.name} cannot have multiple @Controller or @BoundController decorators.`,
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
