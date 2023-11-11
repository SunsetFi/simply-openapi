import { PartialDeep } from "type-fest";
import { OperationObject } from "openapi3-ts/dist/oas31";

import { SOCControllerMethodHandlerArg } from "../openapi";
import { Middleware, RequestMethod } from "../types";

import { defineMetadata, getMetadata, mergeMetadata } from "./reflect";
import { OperationHandlerMiddleware } from "../routes";

const SOCControllerMethodMetadataKey = "soc:controller-method";

export interface SOCControllerMethodCommonMetadata {
  /**
   * Middleware for transforming the arguments or response of the handler.
   */
  handlerMiddleware?: OperationHandlerMiddleware[];

  /**
   * Express middleware to run around the handler.
   */
  expressMiddleware?: Middleware[];
}

export interface SOCBoundControllerMethodMetadata
  extends SOCControllerMethodCommonMetadata {
  operationId: string;
  args: (SOCControllerMethodHandlerArg | undefined)[];
}
export function isSOCBoundControllerMethodMetadata(
  metadata: SOCControllerMethodMetadata
): metadata is SOCBoundControllerMethodMetadata {
  return "operationId" in metadata;
}

export interface SOCCustomControllerMethodMetadata
  extends SOCControllerMethodCommonMetadata {
  path: string;
  method: RequestMethod;
  args: SOCControllerMethodHandlerArg[];
  operationFragment: PartialDeep<OperationObject>;
}
export function isSOCCustomControllerMethodMetadata(
  metadata: SOCControllerMethodMetadata
): metadata is SOCCustomControllerMethodMetadata {
  return "method" in metadata;
}

export type SOCControllerMethodMetadata =
  | SOCBoundControllerMethodMetadata
  | SOCCustomControllerMethodMetadata;

export function setSOCControllerMethodMetadata(
  target: any,
  metadata: SOCControllerMethodMetadata,
  methodName: string | symbol
) {
  defineMetadata(SOCControllerMethodMetadataKey, metadata, target, methodName);
}

export function mergeSOCControllerMethodMetadata(
  target: any,
  metadata:
    | PartialDeep<SOCControllerMethodMetadata>
    | ((
        previous: PartialDeep<SOCControllerMethodMetadata>
      ) => PartialDeep<SOCControllerMethodMetadata>),
  methodName: string | symbol
) {
  if (typeof metadata === "function") {
    const previous = getSOCControllerMethodMetadata(target, methodName);
    metadata = metadata(previous ?? {});
    defineMetadata(
      SOCControllerMethodMetadataKey,
      metadata,
      target,
      methodName
    );
  } else {
    mergeMetadata(SOCControllerMethodMetadataKey, metadata, target, methodName);
  }
}

export function getSOCControllerMethodMetadata(
  target: any,
  methodName: string | symbol
): SOCControllerMethodMetadata | null {
  return (
    getMetadata(SOCControllerMethodMetadataKey, target, methodName) ?? null
  );
}
