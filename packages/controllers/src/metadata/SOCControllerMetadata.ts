import { OpenAPIObject } from "openapi3-ts/oas31";
import { PartialDeep } from "type-fest";
import { merge } from "lodash";

import { OperationHandlerMiddleware } from "../routes";
import { ControllerObject, Middleware } from "../types";

import { defineConstructorMetadata, getConstructorMetadata } from "./reflect";

const SOCControllerMetadataKey = "soc:controller";

export interface SOCCommonControllerMetadata {
  /**
   * Middleware for transforming the arguments or response of the handler.
   */
  handlerMiddleware?: OperationHandlerMiddleware[];

  /**
   * Express middleware to run before the handler.
   */
  preExpressMiddleware?: Middleware[];
}

export interface SOCBoundControllerMetadata
  extends SOCCommonControllerMetadata {
  type?: "bound";
}

export interface SOCCustomControllerMetadata
  extends SOCCommonControllerMetadata {
  type?: "custom";

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

export function isSOCCustomControllerMetadata(
  metadata: SOCControllerMetadata,
): metadata is SOCCustomControllerMetadata {
  return metadata.type === "custom";
}

// FIXME: Make everything partial, as not all decorators may be present, and wont be during buildout.
// Validate for this in spec builder.
export type SOCControllerMetadata =
  | SOCBoundControllerMetadata
  | SOCCustomControllerMetadata;

export function mergeSOCControllerMetadata(
  target: any,
  metadata:
    | PartialDeep<SOCControllerMetadata>
    | ((
        previous: PartialDeep<SOCControllerMetadata>,
      ) => PartialDeep<SOCControllerMetadata>),
) {
  if (typeof metadata === "function") {
    metadata = metadata(getSOCControllerMetadata(target) ?? {});
    defineConstructorMetadata(SOCControllerMetadataKey, metadata, target);
  } else {
    const previous = getSOCControllerMetadata(target) ?? {};
    defineConstructorMetadata(
      SOCControllerMetadataKey,
      merge(previous, metadata),
      target,
    );
  }
}

export function setSOCControllerMetadata(
  target: any,
  metadata: SOCControllerMetadata,
) {
  defineConstructorMetadata(SOCControllerMetadataKey, metadata, target);
}

export function getSOCControllerMetadata(
  target: ControllerObject,
): SOCControllerMetadata | null {
  return getConstructorMetadata(SOCControllerMetadataKey, target) ?? null;
}
