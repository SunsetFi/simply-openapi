import { NextFunction, Request, Response, Router } from "express";
import { merge } from "lodash";

import { SOCControllerMethodHandlerArg } from "../../openapi";
import { isNotNullOrUndefined } from "../../utils";
import { ControllerInstance, Middleware } from "../../types";

import { MethodHandlerContext } from "../MethodHandlerContext";

import { RequestData, isExtractedRequestExtensionName } from "./types";

import { RequestProcessor } from "./request-processors";
import {
  OperationHandlerMiddleware,
  RequestContext,
  OperationHandlerMiddlewareNextFunction,
} from "./handler-middleware";

export class MethodHandler {
  private _selfRoute = Router({ mergeParams: true });

  constructor(
    private _controller: ControllerInstance,
    private _handler: Function,
    private _handlerArgs: (SOCControllerMethodHandlerArg | undefined)[],
    private _requestProcessors: RequestProcessor[],
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
      // It would be nice if handler middleware could mess with the req object properties so that we could embed express middleware,
      // but we have a chicken-egg thing where we do not want to invoke middleware unless the request is valid, and the validators
      // are responsible for pulling the request data.
      const requestData: RequestData = {
        body: undefined,
        parameters: {},
        security: {},
      };

      const ctx = RequestContext.fromMethodHandlerContext(
        this._context,
        req,
        res,
      );

      // Note: For performance we could await all of these in parallel, but we run them in order
      // so as to call security before the others.  This is important, as we don't want to validate against
      // the rest of the schema and reveal things about the request if the security fails.
      for (const processor of this._requestProcessors) {
        let result = processor(ctx);
        if (typeof result === "function") {
          result = await result(requestData);
        } else {
          merge(requestData, await result);
        }
      }

      const args = this._extractArgs(req, res, requestData);

      // Would be nice to associate requestData with the request context, but we use request context in the processors to build the request data.
      // This would itself not be a problem except for the fact that we let request processors return entirely new request data objects.
      const result = await this._runHandler(ctx, args);

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

    const executeMiddleware = async (index: number): Promise<any> => {
      if (index >= stack.length) {
        return this._handler.apply(this._controller, args);
      }

      const next: OperationHandlerMiddlewareNextFunction = async () => {
        return executeMiddleware(index + 1);
      };

      const currentMiddleware = stack[index];
      return currentMiddleware(context, next);
    };

    return executeMiddleware(0);
  }

  private _extractArgs(
    req: Request,
    res: Response,
    requestData: RequestData,
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
          // It should be safe to return undefined here, as the processor should have thrown for required bodies.
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
