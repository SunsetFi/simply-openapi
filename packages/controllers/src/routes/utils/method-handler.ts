import {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from "express";
import {
  OperationObject,
  PathItemObject,
  OpenAPIObject,
  SchemaObject,
} from "openapi3-ts/oas31";
import { isObject, isFunction, merge } from "lodash";
import AJV, { ValidationError } from "ajv";

import {
  SOCControllerMethodExtensionData,
  SOCControllerMethodExtensionName,
  validateSOCControllerMethodExtensionData,
} from "../../openapi";
import { isNotNullOrUndefined } from "../../utils";
import { ExtractedRequestData } from "../../types";

import { OperationHandlerMiddleware } from "../handler-middleware";

import { OperationHandlerMiddlewareManager } from "./OperationHandlerMiddlewareManager";
import {
  RequestDataProcessor,
  RequestDataProcessorFactory,
} from "../request-data";

export interface MethodHandlerOpts {
  /**
   * Resolve a controller specified in the x-simply-controller-method extension into a controller object.
   * @param controller The controller to resolve.
   * @returns The resolved controller
   */
  resolveController?: (controller: object | string | symbol) => object;

  /**
   * Resolve a method specified in the x-simply-controller-method extension into a method.
   * @param controller The controller containing the method to resolve.
   * @param method The method to resolve.
   * @returns The resolved method
   */
  resolveHandler?: (
    controller: object,
    method: Function | string | symbol,
  ) => Function;

  /**
   * Request data processors are responsible for both validating the request conforms to the OpenAPI specification
   * as well as extracting the data to be presented to the handler function.
   */
  requestDataProcessorFactories?: RequestDataProcessorFactory[];

  /**
   * Middleware to apply to all handlers.
   * This middleware will apply in-order before any middleware registered on the operation.
   *
   * In addition to the middleware specified here, the last middleware will always be one that
   * processes json responses.
   */
  handlerMiddleware?: OperationHandlerMiddleware[];

  /**
   * Middleware to apply to the express router before the request.
   */
  preExpressMiddleware?: RequestHandler[];

  /**
   * Middleware to apply to the express router after the request.
   */
  postExpressMiddleware?: RequestHandler[];
}

export class MethodHandler {
  private _selfRoute = Router({ mergeParams: true });

  private _controller: object;
  private _handler: Function;

  private _extensionData: SOCControllerMethodExtensionData;

  private _processors: RequestDataProcessor[];

  // FIXME: Constructor does a lot of adjustments that should be done externally.
  // We should just take in the finished middleware/handlers/resolvers and such.
  constructor(
    private _spec: OpenAPIObject,
    private _path: string,
    private _pathItem: PathItemObject,
    private _method: string,
    private _operation: OperationObject,
    private _ajv: AJV,
    private _opts: MethodHandlerOpts,
  ) {
    let { resolveController, resolveHandler } = _opts;

    if (!resolveController) {
      resolveController = (controller) => {
        if (!isObject(controller)) {
          throw new Error(
            `Controller for operation ${
              _operation.operationId
            } handling \"${_method} ${_path}\" is not an object (got ${String(
              this._extensionData.controller,
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
              _operation.operationId
            }\" handling \"${_method} ${_path}\" is not a function (got ${String(
              this._extensionData.handler,
            )}).`,
          );
        }

        return method;
      };
    }

    const createValueProcessor = (schema: SchemaObject) => {
      // Wrap the value so that coersion functions properly on non-reference values.
      const wrappedSchema: SchemaObject = {
        type: "object",
        properties: {
          value: schema,
        },
      };

      const validate = this._ajv.compile(wrappedSchema);
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

    this._processors = (_opts.requestDataProcessorFactories ?? [])
      .map((factory) =>
        factory({
          spec: _spec,
          path: _path,
          method: _method,
          pathItem: _pathItem,
          operation: _operation,
          controller: this._controller,
          handler: this._handler,
          createValueProcessor,
        }),
      )
      .filter(isNotNullOrUndefined);

    this._extensionData = _operation[
      SOCControllerMethodExtensionName
    ] as SOCControllerMethodExtensionData;

    if (!this._extensionData) {
      throw new Error(
        `Operation ${_operation.operationId} is missing the ${SOCControllerMethodExtensionName} extension.`,
      );
    }

    if (!validateSOCControllerMethodExtensionData(this._extensionData)) {
      throw new Error(
        `Operation ${
          _operation.operationId
        } has an invalid ${SOCControllerMethodExtensionName} extension: ${this._ajv.errorsText(
          validateSOCControllerMethodExtensionData.errors,
        )}}`,
      );
    }

    this._controller = this._opts.resolveController
      ? this._opts.resolveController(this._extensionData.controller)
      : (this._extensionData.controller as any);

    this._handler = resolveHandler(
      this._controller,
      this._extensionData.handler,
    );

    // We use a router to handle the complex process of performing the middleware composition for us.
    if (this._opts.preExpressMiddleware) {
      this._selfRoute.use(...this._opts.preExpressMiddleware);
    }

    const invokeHandlerBound = this._invokeHandler.bind(this);
    this._selfRoute.use(invokeHandlerBound);

    if (this._opts.postExpressMiddleware) {
      this._selfRoute.use(...this._opts.postExpressMiddleware);
    }
  }

  handle(req: Request, res: Response, next: NextFunction) {
    this._selfRoute(req, res, next);
  }

  private async _invokeHandler(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const requestData: ExtractedRequestData = {
        body: undefined,
        parameters: {},
      };

      for (const processor of this._processors) {
        let result = processor(req);
        if (typeof result === "function") {
          result = result(requestData);
        } else {
          merge(requestData, result);
        }
      }

      const args = this._extractArgs(req, res, requestData);

      var middlewareManager = new OperationHandlerMiddlewareManager(
        this._handler.bind(this._controller),
      );
      // TODO: Is this order right?  We want to run our local middleware closer to the handling than the external middleware.
      middlewareManager.use(
        ...(this._extensionData.handlerMiddleware ?? []),
        ...(this._opts.handlerMiddleware ?? []),
      );

      // Call the handler function with the arguments
      // Our middleware will handle return values as needed.
      const result = await middlewareManager.run(
        {
          spec: this._spec,
          controller: this._controller,
          handler: this._handler,
          path: this._path,
          pathItem: this._pathItem,
          method: this._method,
          operation: this._operation,
          req,
          res,
        },
        args,
      );

      if (result !== undefined) {
        throw new Error(
          `Handler returned a result of type ${typeof result} that was not consumed by a handler middleware.  Are you missing a handler middleware to handle the result type?`,
        );
      }
    } catch (err: any) {
      next(err);
    }
  }

  private _extractArgs(
    req: Request,
    res: Response,
    requestData: ExtractedRequestData,
  ): any[] {
    return (this._extensionData.handlerArgs ?? [])
      .filter(isNotNullOrUndefined)
      .map((arg) => {
        switch (arg?.type) {
          case "openapi-parameter":
            // It should be safe to return undefined here, as the processor should have thrown for required parameters.
            return requestData.parameters[arg.parameterName];
          case "openapi-requestbody":
            // It should be safe to return undefined here, as the processor should have thrown for required headers.
            return requestData.body;
          case "request-raw":
            return req;
          case "response-raw":
            return res;
          default:
            throw new Error(
              `Unknown handler argument type ${arg?.type} for operation ${this._operation.operationId}.`,
            );
        }
      });
  }
}
