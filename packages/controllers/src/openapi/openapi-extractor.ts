import { InfoObject, OpenAPIObject } from "openapi3-ts/oas31";
import { cloneDeep } from "lodash";

import { getClassMethods, mergeCombineArrays } from "../utils";
import { ControllerObject } from "../types";

import {
  OpenAPIObjectControllerExtractor,
  OpenAPIObjectExtractor,
  OpenAPIObjectMethodExtractor,
  isOpenAPIObjectControllerExtractor,
  isOpenAPIObjectMethodExtractor,
} from "./types";
import {
  extractSOCBoundMethodSpec,
  extractSOCCustomMethodSpec,
  extractSOCAuthenticatorSpec,
  extractSOCControllerSpec,
} from "./spec-extractors";
import { nameController } from "./utils";

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
  controllerSpecExtractors?: OpenAPIObjectExtractor[];
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
  controllers: ControllerObject[],
  opts: CreateOpenAPIPathsFromControllerOptions = {},
): OpenAPIObject {
  let spec: OpenAPIObject = {
    openapi: "3.1.0",
    info,
    paths: {},
  };

  return addendOpenAPIFromControllers(spec, controllers, opts);
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
  controllers: ControllerObject[],
  opts: CreateOpenAPIPathsFromControllerOptions = {},
) {
  const extractors = opts.controllerSpecExtractors ?? [];

  // Push ours first, so others can override us.
  extractors.unshift(extractSOCControllerSpec);
  extractors.unshift(extractSOCAuthenticatorSpec);
  extractors.unshift(extractSOCBoundMethodSpec);
  extractors.unshift(extractSOCCustomMethodSpec);

  spec = cloneDeep(spec);
  spec.paths = spec.paths ?? {};

  const seen = new Set<ControllerObject>();

  // Add from root first, in case we have global data that needs to be referenced by methods.
  for (const controller of controllers) {
    spec = addOpenAPIPathsFromControllerRoot(
      controller,
      spec,
      extractors,
      seen,
    );
  }

  // Add from methods
  for (const controller of controllers) {
    spec = addOpenAPIPathsFromControllerMethods(
      controller,
      spec,
      extractors,
      seen,
    );
  }

  const unseen = controllers.find((c) => !seen.has(c));
  if (!opts.ignoreEmptyControllers && unseen) {
    throw new Error(
      `Controller ${nameController(
        unseen,
      )} has no SOC-decorated methods.  Please ensure this is a valid controller, or set the ignoreEmptyControllers option to true.`,
    );
  }

  return spec;
}

function addOpenAPIPathsFromControllerRoot(
  controller: ControllerObject,
  spec: OpenAPIObject,
  extractors: OpenAPIObjectExtractor[],
  seen: Set<ControllerObject>,
): OpenAPIObject {
  return extractors
    .filter(isOpenAPIObjectControllerExtractor)
    .reduce(
      (spec, extractor) =>
        runControllerExtractor(spec, extractor, controller, seen),
      spec,
    );
}

function addOpenAPIPathsFromControllerMethods(
  controller: ControllerObject,
  spec: OpenAPIObject,
  extractors: OpenAPIObjectExtractor[],
  seen: Set<ControllerObject>,
): OpenAPIObject {
  return extractors
    .filter(isOpenAPIObjectMethodExtractor)
    .reduce((spec, extractor) => {
      for (const [methodName] of getClassMethods(controller)) {
        spec = runMethodExtractor(
          spec,
          extractor,
          controller,
          methodName,
          seen,
        );
      }
      return spec;
    }, spec);
}

function runControllerExtractor(
  spec: OpenAPIObject,
  extractor: OpenAPIObjectControllerExtractor,
  controller: ControllerObject,
  seen: Set<ControllerObject>,
): OpenAPIObject {
  const result = extractor(controller);
  if (result) {
    seen.add(controller);
    if (typeof result === "function") {
      return result(spec);
    }

    return mergeCombineArrays(result, spec);
  }

  return spec;
}

function runMethodExtractor(
  spec: OpenAPIObject,
  extractor: OpenAPIObjectMethodExtractor,
  controller: ControllerObject,
  methodName: string | symbol,
  seen: Set<ControllerObject>,
): OpenAPIObject {
  const result = extractor(controller, methodName);
  if (result) {
    seen.add(controller);
    if (typeof result === "function") {
      return result(spec);
    }

    return mergeCombineArrays(result, spec);
  }

  return spec;
}
