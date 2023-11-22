import { NextFunction, Request, Response, Router } from "express";
import { merge } from "lodash";

import { SOCControllerMethodHandlerArg } from "../../openapi";
import { isNotNullOrUndefined } from "../../utils";
import {
  ControllerInstance,
  ExtractedRequestData,
  Middleware,
  isExtractedRequestExtensionName,
} from "../../types";

import { RequestDataProcessor } from "./request-data";
import {
  OperationHandlerMiddleware,
  RequestContext,
  OperationHandlerMiddlewareNextFunction,
} from "./handler-middleware";
import { MethodHandlerContext } from "../MethodHandlerContext";

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

      const result = await this._runHandler(
        RequestContext.fromMethodHandlerContext(this._context, req, res),
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

  private async _runHandler(
    context: RequestContext,
    args: any[],
  ): Promise<any> {
    const stack = this._handlerMiddleware;

    const executeMiddleware = async (
      index: number,
      args: any[],
    ): Promise<any> => {
      if (index >= stack.length) {
        return this._handler.apply(this._controller, args);
      }

      const next: OperationHandlerMiddlewareNextFunction = async () => {
        return executeMiddleware(index + 1, args);
      };

      // We originally wanted handlers to be able to swap out arguments passed to the handler,
      // but that use case is now more robustly covered by request data processors.
      // next.withArgs = async (...newArgs: any[]) => {
      //   return executeMiddleware(index + 1, newArgs);
      // };

      const currentMiddleware = stack[index];
      return currentMiddleware(context, next);
    };

    return executeMiddleware(0, args);
  }

  private _extractArgs(
    req: Request,
    res: Response,
    requestData: ExtractedRequestData,
  ): any[] {
    return (this._handlerArgs ?? []).filter(isNotNullOrUndefined).map((arg) => {
      if (!arg) {
        return undefined;
      }

      if (isExtractedRequestExtensionName(arg.type)) {
        return requestData[arg.type];
      }

      switch (arg.type) {
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
            `Unknown handler argument type ${arg.type} for operation ${this._context.operation.operationId}.`,
          );
      }
    });
  }
}
