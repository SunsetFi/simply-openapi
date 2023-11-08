import { OpenAPIObject } from "openapi3-ts/oas31";
import { PartialDeep } from "type-fest";

import { defineMetadata, getMetadata, mergeMetadata } from "./reflect";
import { OperationHandlerMiddleware } from "../routes";
import { Middleware } from "../types";

const SECControllerMetadataKey = "sec:controller";

export interface SECControllerMetadata {
  /**
   * The path of this controller.  This will prefix all method paths.
   */
  path?: string;

  /**
   * Common tags for this controller.  All methods will inherit these tags.
   */
  tags?: string[];

  /**
   * A partial fragment of an OpenAPI operation object this controller contributes.
   */
  openapiFragment?: PartialDeep<OpenAPIObject>;

  /**
   * Middleware for transforming the arguments or response of the handler.
   */
  handlerMiddleware?: OperationHandlerMiddleware[];

  /**
   * Express middleware to run around the handler.
   */
  expressMiddleware?: Middleware[];
}

export function mergeSECControllerMetadata(
  target: any,
  metadata:
    | PartialDeep<SECControllerMetadata>
    | ((
        previous: PartialDeep<SECControllerMetadata>
      ) => PartialDeep<SECControllerMetadata>)
) {
  if (typeof metadata === "function") {
    metadata = metadata(getSECControllerMetadata(target) ?? {});
    defineMetadata(SECControllerMetadataKey, metadata, target);
  } else {
    mergeMetadata(SECControllerMetadataKey, metadata, target);
  }
}

export function setSECControllerMetadata(
  target: any,
  metadata: SECControllerMetadata
) {
  defineMetadata(SECControllerMetadataKey, metadata, target);
}

export function getSECControllerMetadata(
  target: any
): SECControllerMetadata | null {
  return getMetadata(SECControllerMetadataKey, target) ?? null;
}
