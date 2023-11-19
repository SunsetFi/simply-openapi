import AJV, { ValidationError } from "ajv";
import { isObject, isFunction } from "lodash";
import { OpenAPIObject, SchemaObject } from "openapi3-ts/oas31";
import {
  SOCControllerMethodExtensionData,
  SOCControllerMethodExtensionName,
  validateSOCControllerMethodExtensionData,
} from "../../openapi";
import { RequestMethod } from "../../types";
import { isNotNullOrUndefined } from "../../utils";
import { MethodHandlerContext } from "../types";
import { CreateMethodHandlerOpts, MethodHandler } from "./MethodHandler";

export function createMethodHandlerFromSpec(
  spec: OpenAPIObject,
  path: string,
  method: RequestMethod,
  ajv: AJV,
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
    throw new Error(
      `Operation ${
        operation.operationId
      } has an invalid ${SOCControllerMethodExtensionName} extension: ${ajv.errorsText(
        validateSOCControllerMethodExtensionData.errors,
      )}}`,
    );
  }

  let { resolveController, resolveHandler } = opts;

  if (!resolveController) {
    resolveController = (controller) => {
      if (!isObject(controller)) {
        throw new Error(
          `Controller for operation ${
            operation.operationId
          } handling \"${method} ${path}\" is not an object (got ${String(
            extensionData.controller,
          )}).`,
        );
      }

      return controller;
    };
  }

  if (!resolveHandler) {
    resolveHandler = (controller, method) => {
      if (
        (typeof method === "string" || typeof method === "symbol") &&
        typeof (controller as any)[method] === "function"
      ) {
        method = (controller as any)[method];
      }

      if (!isFunction(method)) {
        throw new Error(
          `Handler for operation \"${
            operation.operationId
          }\" handling \"${String(
            method,
          )} ${path}\" is not a function (got ${String(
            extensionData.handler,
          )}).`,
        );
      }

      return method;
    };
  }

  const controller = resolveController(extensionData.controller);
  const handler = resolveHandler(controller, extensionData.handler);

  const createValueProcessor = (schema: SchemaObject) => {
    // Wrap the value so that coersion functions properly on non-reference values.
    const wrappedSchema: SchemaObject = {
      type: "object",
      properties: {
        value: schema,
      },
    };

    const validate = ajv.compile(wrappedSchema);
    return (value: any) => {
      const wrapper = { value };
      if (!validate(wrapper)) {
        // Note: Our errors will have `value` as the property, which isnt nescesarily a bad thing,
        // but, we probably do want to remove it.
        throw new ValidationError(validate.errors!);
      }

      return wrapper.value;
    };
  };

  const processors = (opts.requestDataProcessorFactories ?? [])
    .map((factory) =>
      factory({
        spec,
        path,
        method,
        pathItem,
        operation,
        controller,
        handler,
        createValueProcessor,
      }),
    )
    .filter(isNotNullOrUndefined);

  const context: MethodHandlerContext = {
    spec,
    path,
    method,
    pathItem,
    operation,
    controller,
    handler,
  };

  const handlerMiddleware = [
    ...(opts.handlerMiddleware ?? []),
    ...(extensionData.handlerMiddleware ?? []),
  ];

  const preExpressMiddleware = [
    ...(opts.preExpressMiddleware ?? []),
    ...(extensionData.preExpressMiddleware ?? []),
  ];

  const postExpressMiddleware = [...(opts.postExpressMiddleware ?? [])];

  return new MethodHandler(
    controller,
    handler,
    extensionData.handlerArgs ?? [],
    processors,
    handlerMiddleware,
    preExpressMiddleware,
    postExpressMiddleware,
    context,
  );
}
