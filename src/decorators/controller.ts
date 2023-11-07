import { OpenAPIObject } from "openapi3-ts/oas31";

import { mergeSECControllerMetadata } from "../metadata";

export function Controller(path?: string) {
  return function (target: any) {
    mergeSECControllerMetadata(target, { path });
  };
}

export function OpenAPI(fragment: Partial<OpenAPIObject>) {
  return function (target: any) {
    mergeSECControllerMetadata(target, { openapiFragment: fragment });
  };
}
