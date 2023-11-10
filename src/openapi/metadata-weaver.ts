import { InfoObject, OpenAPIObject } from "openapi3-ts/oas31";
import { cloneDeep, merge } from "lodash";

import { getSOCControllerMetadata } from "../metadata";
import { getInstanceMethods } from "../utils";

import { ControllerInstance, OpenAPIObjectExtractor } from "./types";
import { extractSOCBoundMethodSpec } from "./spec-extractors";

export interface CreateOpenAPIPathsFromControllerOptions {
  operationSpecExtractors?: OpenAPIObjectExtractor[];
}

export function createOpenAPIFromControllers(
  info: InfoObject,
  controllers: ControllerInstance[],
  opts: CreateOpenAPIPathsFromControllerOptions = {}
): OpenAPIObject {
  if (!opts.operationSpecExtractors) {
    opts.operationSpecExtractors = [];
  }

  // Push ours first, so others can override us.
  opts.operationSpecExtractors.unshift(extractSOCCustomMethodExtension);

  const spec: OpenAPIObject = {
    openapi: "3.0.0",
    info,
    paths: {},
  };

  for (const controller of controllers) {
    addOpenAPIPathsFromController(
      controller,
      spec,
      opts.operationSpecExtractors ?? []
    );
  }

  return spec;
}

export function addendOpenAPIFromControllers(
  spec: OpenAPIObject,
  controllers: ControllerInstance[],
  opts: CreateOpenAPIPathsFromControllerOptions = {}
) {
  if (!opts.operationSpecExtractors) {
    opts.operationSpecExtractors = [];
  }

  // Push ours first, so others can override us.
  opts.operationSpecExtractors.unshift(extractSOCBoundMethodSpec);
  opts.operationSpecExtractors.unshift(extractSOCCustomMethodExtension);

  spec = cloneDeep(spec);
  spec.paths = spec.paths ?? {};
  for (const controller of controllers) {
    addOpenAPIPathsFromController(
      controller,
      spec,
      opts.operationSpecExtractors ?? []
    );
  }

  return spec;
}

function addOpenAPIPathsFromController(
  controller: ControllerInstance,
  spec: OpenAPIObject,
  extractors: OpenAPIObjectExtractor[]
) {
  const controllerMetadata = getSOCControllerMetadata(controller);
  if (!controllerMetadata) {
    throw new Error(
      `Controller ${controller.constructor.name} is missing @Controller decorator.`
    );
  }

  for (const method of getInstanceMethods(controller)) {
    extractors.reduce((spec, extractor) => {
      const result = extractor(controller, method.name);
      if (result) {
        if (typeof result === "function") {
          return result(spec);
        }
        return merge(result, spec);
      }

      return spec;
    }, spec);
  }
}
function extractSOCCustomMethodExtension(
  controller: object,
  methodName: string | symbol
):
  | OpenAPIObject
  | ((operation: OpenAPIObject) => OpenAPIObject)
  | null
  | undefined {
  throw new Error("Function not implemented.");
}
