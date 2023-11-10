import { OpenAPIObject } from "openapi3-ts/oas31";
import { PartialDeep } from "type-fest";

import { defineMetadata, getMetadata, mergeMetadata } from "./reflect";
import { OperationHandlerMiddleware } from "../routes";
import { Middleware } from "../types";

const SOCControllerMetadataKey = "soc:controller";

export interface SOCCommonControllerMetadata {
  /**
   * Middleware for transforming the arguments or response of the handler.
   */
  handlerMiddleware?: OperationHandlerMiddleware[];

  /**
   * Express middleware to run around the handler.
   */
  expressMiddleware?: Middleware[];
}

export interface SOCBoundControllerMetadata
  extends SOCCommonControllerMetadata {
  type: "bound";
}

export interface SOCCustomControllerMetadata
  extends SOCCommonControllerMetadata {
  type: "custom";

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
}

export type SOCControllerMetadata =
  | SOCBoundControllerMetadata
  | SOCCustomControllerMetadata;

export function mergeSOCControllerMetadata(
  target: any,
  metadata:
    | PartialDeep<SOCControllerMetadata>
    | ((
        previous: PartialDeep<SOCControllerMetadata>
      ) => PartialDeep<SOCControllerMetadata>)
) {
  if (typeof metadata === "function") {
    metadata = metadata(getSOCControllerMetadata(target) ?? {});
    defineMetadata(SOCControllerMetadataKey, metadata, target);
  } else {
    mergeMetadata(SOCControllerMetadataKey, metadata, target);
  }
}

export function setSOCControllerMetadata(
  target: any,
  metadata: SOCControllerMetadata
) {
  defineMetadata(SOCControllerMetadataKey, metadata, target);
}

export function getSOCControllerMetadata(
  target: any
): SOCControllerMetadata | null {
  return getMetadata(SOCControllerMetadataKey, target) ?? null;
}
