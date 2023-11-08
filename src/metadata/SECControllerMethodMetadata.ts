import { PartialDeep } from "type-fest";
import { OperationObject } from "openapi3-ts/dist/oas31";

import { SECControllerMethodHandlerArg } from "../openapi";
import { Middleware, RequestMethod } from "../types";

import { defineMetadata, getMetadata, mergeMetadata } from "./reflect";
import { OperationHandlerMiddleware } from "../routes";

const SECControllerMethodMetadataKey = "sec:controller-method";

export interface SECControllerMethodCommonMetadata {
  /**
   * Middleware for transforming the arguments or response of the handler.
   */
  handlerMiddleware?: OperationHandlerMiddleware[];

  /**
   * Express middleware to run around the handler.
   */
  expressMiddleware?: Middleware[];
}

export interface SECBondControllerMethodMetadata
  extends SECControllerMethodCommonMetadata {
  operationId: string;
  args: SECControllerMethodHandlerArg[];
}
export function isSECBoundControllerMethodMetadata(
  metadata: SECControllerMethodMetadata
): metadata is SECBondControllerMethodMetadata {
  return "operationId" in metadata;
}

export interface SECCustomControllerMethodMetadata
  extends SECControllerMethodCommonMetadata {
  path: string;
  method: RequestMethod;
  args: SECControllerMethodHandlerArg[];
  operationFragment: PartialDeep<OperationObject>;
}
export function isSECCustomControllerMethodMetadata(
  metadata: SECControllerMethodMetadata
): metadata is SECCustomControllerMethodMetadata {
  return "method" in metadata;
}

export type SECControllerMethodMetadata =
  | SECBondControllerMethodMetadata
  | SECCustomControllerMethodMetadata;

export function setSECControllerMethodMetadata(
  target: any,
  metadata: SECControllerMethodMetadata,
  methodName: string | symbol
) {
  defineMetadata(SECControllerMethodMetadataKey, metadata, target, methodName);
}

export function mergeSECControllerMethodMetadata(
  target: any,
  metadata:
    | PartialDeep<SECControllerMethodMetadata>
    | ((
        previous: PartialDeep<SECControllerMethodMetadata>
      ) => PartialDeep<SECControllerMethodMetadata>),
  methodName: string | symbol
) {
  if (typeof metadata === "function") {
    const previous = getSECControllerMethodMetadata(target, methodName);
    metadata = metadata(previous ?? {});
    defineMetadata(
      SECControllerMethodMetadataKey,
      metadata,
      target,
      methodName
    );
  } else {
    mergeMetadata(SECControllerMethodMetadataKey, metadata, target, methodName);
  }
}

export function getSECControllerMethodMetadata(
  target: any,
  methodName: string | symbol
): SECControllerMethodMetadata | null {
  return (
    getMetadata(SECControllerMethodMetadataKey, target, methodName) ?? null
  );
}
