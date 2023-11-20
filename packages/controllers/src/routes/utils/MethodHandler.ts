import { NextFunction, Request, Response, Router } from "express";
import { merge } from "lodash";

import { SOCControllerMethodHandlerArg } from "../../openapi";
import { isNotNullOrUndefined } from "../../utils";
import {
  ControllerInstance,
  ExtractedRequestData,
  Middleware,
} from "../../types";

import { OperationHandlerMiddleware } from "../handler-middleware";

import { OperationHandlerMiddlewareManager } from "./OperationHandlerMiddlewareManager";
import {
  RequestDataProcessor,
  RequestDataProcessorFactory,
} from "../request-data";
import { MethodHandlerContext, OperationContext } from "../types";

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
  preExpressMiddleware?: Middleware[];

  /**
   * Middleware to apply to the express router after the request.
   */
  postExpressMiddleware?: Middleware[];
}

export class MethodHandler {
  private _selfRoute = Router({ mergeParams: true });

  constructor(
    private _controller: ControllerInstance,
    private _handler: Function,
    private _handlerArgs: (SOCControllerMethodHandlerArg | undefined)[],
    private _dataProcessors: RequestDataProcessor[],
    private _handlerMiddleware: OperationHandlerMiddleware[],
    preExpressMiddleware: Middleware[],
    postExpressMiddleware: Middleware[],
    private _context: MethodHandlerContext,
  ) {
    // We use a router to handle the complex process of performing the middleware composition for us.
    if (preExpressMiddleware.length > 0) {
      this._selfRoute.use(...preExpressMiddleware);
    }

    const invokeHandlerBound = this._invokeHandler.bind(this);
    this._selfRoute.use(invokeHandlerBound);

    if (postExpressMiddleware.length > 0) {
      this._selfRoute.use(...postExpressMiddleware);
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

      for (const processor of this._dataProcessors) {
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
      middlewareManager.use(...this._handlerMiddleware);

      // Call the handler function with the arguments
      // Our middleware will handle return values as needed.
      const result = await middlewareManager.run(
        {
          ...this._context,
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
    return (this._handlerArgs ?? []).filter(isNotNullOrUndefined).map((arg) => {
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
            `Unknown handler argument type ${arg?.type} for operation ${this._context.operation.operationId}.`,
          );
      }
    });
  }
}
