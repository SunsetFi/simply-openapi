import { InfoObject, OpenAPIObject } from "openapi3-ts/oas31";
import { cloneDeep, merge } from "lodash";

import { getSOCControllerMetadata } from "../metadata";
import { getInstanceMethods } from "../utils";

import { ControllerInstance, OpenAPIObjectExtractor } from "./types";
import {
  extractSOCBoundMethodSpec,
  extractSOCCustomMethodSpec,
} from "./spec-extractors";

export interface CreateOpenAPIPathsFromControllerOptions {
  /**
   * By default, errors will be thrown if a passed controller is totally unrecognized.  This is to prevent accidental passing of invalid objects.
   * If for some reason you wish to disable this behavior, set this to true.
   */
  ignoreEmptyControllers?: boolean;

  /**
   * A list of extractors to use when extracting OpenAPI specs from controllers.
   *
   * The extractors for Simply Open Controllers are already included by default, and will be processed before any extractors supplied here.
   * If an extractor returns an object, it will be merged.  If it returns a function, the function will be called with the previous spec and the return value
   * will become the new spec.
   */
  operationSpecExtractors?: OpenAPIObjectExtractor[];
}

/**
 * Create an OpenAPI spec object from the list of controllers.
 * @param info The information block required by the OpenAPI spec.
 * @param controllers An array of controllers to extract data from.
 * @param opts Additional options for the creation of the spec.
 * @returns An OpenAPI specification for the given controllers.
 */
export function createOpenAPIFromControllers(
  info: InfoObject,
  controllers: ControllerInstance[],
  opts: CreateOpenAPIPathsFromControllerOptions = {}
): OpenAPIObject {
  if (!opts.operationSpecExtractors) {
    opts.operationSpecExtractors = [];
  }

  // Push ours first, so others can override us.
  opts.operationSpecExtractors.unshift(extractSOCCustomMethodSpec);

  const spec: OpenAPIObject = {
    openapi: "3.0.0",
    info,
    paths: {},
  };

  for (const controller of controllers) {
    addOpenAPIPathsFromController(
      controller,
      spec,
      opts.operationSpecExtractors ?? [],
      opts.ignoreEmptyControllers ?? false
    );
  }

  return spec;
}

/**
 * Create an copy of the given OpenAPI spec with data addended from the list of controllers.
 * @param spec The OpenAPI spec to copy and addend.
 * @param controllers An array of controllers to extract data from.
 * @param opts Additional options for the creation of the spec.
 * @returns A deep copy of the passed OpenAPI specification with information from given controllers addended.
 */
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
  opts.operationSpecExtractors.unshift(extractSOCCustomMethodSpec);

  spec = cloneDeep(spec);
  spec.paths = spec.paths ?? {};
  for (const controller of controllers) {
    addOpenAPIPathsFromController(
      controller,
      spec,
      opts.operationSpecExtractors ?? [],
      opts.ignoreEmptyControllers ?? false
    );
  }

  return spec;
}

function addOpenAPIPathsFromController(
  controller: ControllerInstance,
  spec: OpenAPIObject,
  extractors: OpenAPIObjectExtractor[],
  ignoreEmptyControllers: boolean
) {
  const controllerMetadata = getSOCControllerMetadata(controller);

  let boundAtLeastOneMethod = false;
  for (const method of getInstanceMethods(controller)) {
    extractors.reduce((spec, extractor) => {
      const result = extractor(controller, method.name);
      if (result) {
        boundAtLeastOneMethod = true;
        if (typeof result === "function") {
          return result(spec);
        }
        return merge(result, spec);
      }

      return spec;
    }, spec);
  }

  if (
    !ignoreEmptyControllers &&
    !controllerMetadata &&
    !boundAtLeastOneMethod
  ) {
    throw new Error(
      `Controller ${controller.constructor.name} has no controller decorator and no openapi methods were found.  Please ensure this is a valid controller, or set the ignoreEmptyControllers option to true.`
    );
  }
}
