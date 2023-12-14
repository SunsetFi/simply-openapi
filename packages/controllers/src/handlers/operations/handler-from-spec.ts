import { isObject, isFunction } from "lodash";
import { OpenAPIObject } from "openapi3-ts/oas31";

import {
  SOCControllerMethodExtensionData,
  SOCControllerMethodExtensionName,
  validateSOCControllerMethodExtensionData,
} from "../../openapi";
import { ControllerInstance, RequestMethod } from "../../types";
import { isConstructor } from "../../utils";
import { ValidatorFactories, errorObjectsToMessage } from "../../validation";

import { MethodHandlerContext } from "../MethodHandlerContext";
import { OperationContext } from "../OperationContext";

import { MethodHandler } from "./MethodHandler";
import { OperationMiddleware } from "./handler-middleware";
import { operationHandlerFallbackResponseMiddleware } from "./handler-middleware/fallback";
import defaultHandlerMiddleware from "./handler-middleware/defaultHandlerMiddleware";

export interface CreateMethodHandlerOpts {
  /**
   * Resolve a controller specified in the x-simply-controller-method extension into a controller object.
   * @param controller The controller to resolve.
   * @param ctx The operation context.
   * @returns The resolved controller
   */
  resolveController?: (
    controller: object | string | symbol,
    ctx: OperationContext,
  ) => object;

  /**
   * Resolve a method specified in the x-simply-controller-method extension into a method.
   * @param controller The controller containing the method to resolve.
   * @param method The method to resolve.
   * @param ctx The operation context.
   * @returns The resolved method
   */
  resolveHandler?: (
    controller: object,
    method: Function | string | symbol,
    ctx: OperationContext,
  ) => Function;

  /**
   * Middleware to apply to all handlers.
   * This middleware will apply in-order before any middleware registered on the operation.
   *
   * In addition to the middleware specified here, the last middleware will always be one that
   * processes json responses.
   */
  handlerMiddleware?: OperationMiddleware[];

  /**
   * If true, ensure that all responses are handled by the handler.
   * If false, no such check will be performed, and handlers that return undefined may leave requests hanging open.
   * @default true
   */
  ensureResponsesHandled?: boolean;
}

export function createMethodHandlerFromSpec(
  spec: OpenAPIObject,
  path: string,
  method: RequestMethod,
  validators: ValidatorFactories,
  opts: CreateMethodHandlerOpts,
) {
  const pathItem = (spec.paths ?? {})[path];
  if (!pathItem) {
    throw new Error(`Path ${path} not found in spec.`);
  }

  const operation = pathItem[method];
  if (!operation) {
    throw new Error(`Operation ${method} not found on path ${path}.`);
  }

  const extensionData = operation[
    SOCControllerMethodExtensionName
  ] as SOCControllerMethodExtensionData;

  if (!extensionData) {
    throw new Error(
      `Operation ${operation.operationId} is missing the ${SOCControllerMethodExtensionName} extension.`,
    );
  }

  if (!validateSOCControllerMethodExtensionData(extensionData)) {
    let addend = "";
    if (validateSOCControllerMethodExtensionData.errors) {
      addend = `: ${errorObjectsToMessage(
        validateSOCControllerMethodExtensionData.errors,
      )}`;
    }
    throw new Error(
      `Operation ${operation.operationId} has an invalid ${SOCControllerMethodExtensionName} extension${addend}}`,
    );
  }

  let { resolveController, resolveHandler } = opts;

  if (!resolveController) {
    resolveController = defaultResolveController;
  }

  if (!resolveHandler) {
    resolveHandler = defaultResolveHandler;
  }

  const opContext = new OperationContext(spec, path, method);

  const controller = resolveController(extensionData.controller, opContext);
  const handler = resolveHandler(controller, extensionData.handler, opContext);

  const methodContext = MethodHandlerContext.fromOperationContext(
    opContext,
    controller,
    handler,
    extensionData.handlerArgs ?? [],
  );

  const handlerMiddleware = [
    ...defaultHandlerMiddleware,
    ...(opts.handlerMiddleware ?? []),
    ...(extensionData.handlerMiddleware ?? []),
  ];

  if (opts.ensureResponsesHandled !== false) {
    handlerMiddleware.unshift(operationHandlerFallbackResponseMiddleware);
  }

  return new MethodHandler(
    controller,
    handler,
    extensionData.handlerArgs ?? [],
    handlerMiddleware,
    methodContext,
    validators,
  );
}

function defaultResolveController(
  controller: string | symbol | object,
  ctx: OperationContext,
) {
  if (!isObject(controller)) {
    throw new Error(
      `Controller for operation ${ctx.operation.operationId} handling \"${
        ctx.method
      } ${ctx.path}\" is not an object (got ${String(controller)}).`,
    );
  }

  return controller;
}

function defaultResolveHandler(
  controller: ControllerInstance,
  method: string | symbol | Function,
  ctx: OperationContext,
) {
  if (typeof method === "string" || typeof method === "symbol") {
    method = (controller as any)[method];
  }

  if (!isFunction(method)) {
    if (isConstructor(controller)) {
      throw new Error(
        `Handler for operation \"${
          ctx.operation.operationId
        }\" handling \"${String(ctx.method)} ${
          ctx.path
        }\" could not be resolved.  The controller seems to be a constructor.  Either pass initialized controllers to createOpenAPIFromControllers, or use a custom resolveController or resolveMethod option to resolve the metadata to their controller and handler instances.`,
      );
    }
    throw new Error(
      `Handler for operation \"${ctx.operation.operationId}\" handling \"${ctx.method} ${ctx.path}\" could not be resolved to a function.  Check that the function exists or supply a custom resolveMethod option to resolve it to its intended handler.`,
    );
  }

  return method;
}
