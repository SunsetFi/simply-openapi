import { OpenAPIObject } from "openapi3-ts/oas31";

import {
  getSOCControllerMetadata,
  mergeSOCControllerMetadata,
} from "../metadata";

export interface ControllerOptions {
  tags?: string[];
}

export function Controller(path?: string, opts?: ControllerOptions) {
  return function (target: any) {
    if (getSOCControllerMetadata(target)?.type === "bound") {
      throw new Error(
        `Controller ${target.name} cannot be both a bound controller and a custom controller.`
      );
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
        `Controller ${target.name} cannot be both a bound controller and a custom controller.`
      );
    }

    mergeSOCControllerMetadata(target, { type: "bound" });
  };
}

export function OpenAPI(fragment: Partial<OpenAPIObject>) {
  return function (target: any) {
    mergeSOCControllerMetadata(target, { openapiFragment: fragment });
  };
}
