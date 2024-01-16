import { NextFunction, Request, Response, Router } from "express";
import bodyParser from "body-parser";

import { SOCControllerMethodHandlerArg } from "../../openapi";
import { isNotNullOrUndefined } from "../../utils";
import { ControllerInstance } from "../../types";
import { ValidatorFactories } from "../../validation";

import { OperationHandlerContext } from "../OperationHandlerContext";
import { OperationRequestContext } from "../OperationRequestContext";

import {
  OperationMiddlewareFunction,
  OperationMiddlewareNextFunction,
  OperationMiddleware,
  isOperationMiddlewareFactory,
  isOperationHandlerMiddleware,
} from "./handler-middleware";
import { OperationMiddlewareFactoryContext } from "./handler-middleware";
import { nameOperationFromContext } from "./utils";

export class MethodHandler {
  private _selfRouter = Router({ mergeParams: true });
  private _handlerMiddleware: OperationMiddlewareFunction[];

  constructor(
    private _controller: ControllerInstance,
    private _handler: Function,
    private _handlerArgs: (SOCControllerMethodHandlerArg | undefined)[],
    handlerMiddleware: OperationMiddleware[],
    private _context: OperationHandlerContext,
    validators: ValidatorFactories,
  ) {
    const middlewareFactory =
      OperationMiddlewareFactoryContext.fromOperationHandlerContext(
        this._context,
        validators,
      );

    this._handlerMiddleware = handlerMiddleware.map((middleware) => {
      if (isOperationMiddlewareFactory(middleware)) {
        return middleware(middlewareFactory);
      } else if (isOperationHandlerMiddleware(middleware)) {
        return middleware;
      } else {
        throw new Error(
          `Unknown operation handler middleware type ${typeof middleware}.  Expected a function with 1 argument for a factory, or a function with 2 argument for middleware.`,
        );
      }
    });

    this._selfRouter.use(
      bodyParser.json({ strict: false }),
      this._handle.bind(this),
    );
  }

  handle(req: Request, res: Response, next: NextFunction) {
    return this._selfRouter(req, res, next);
  }

  private async _handle(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = OperationRequestContext.fromOperationHandlerContext(
        this._context,
        req,
        res,
      );

      // Would be nice to associate requestData with the request context, but we use request context in the processors to build the request data.
      // This would itself not be a problem except for the fact that we let request processors return entirely new request data objects.
      const result = await this._runHandler(ctx);

      if (result !== undefined) {
        throw new Error(
          `Handler returned a result of type ${typeof result} that was not consumed by a handler middleware.  Are you missing a handler middleware to handle the result type?`,
        );
      }
    } catch (err: any) {
      next(err);
    }
  }

  private async _runHandler(context: OperationRequestContext): Promise<any> {
    const stack = this._handlerMiddleware;

    const executeMiddleware = async (index: number): Promise<any> => {
      if (index >= stack.length) {
        const args = this._extractArgs(context);
        return this._handler.apply(this._controller, args);
      }

      const next: OperationMiddlewareNextFunction = async () => {
        return executeMiddleware(index + 1);
      };

      const currentMiddleware = stack[index];
      return currentMiddleware(context, next);
    };

    return executeMiddleware(0);
  }

  private _extractArgs(context: OperationRequestContext): any[] {
    return (this._handlerArgs ?? []).filter(isNotNullOrUndefined).map((arg) => {
      if (!arg) {
        return undefined;
      }

      switch (arg.type) {
        case "request-data":
          return context.getRequestData(arg.requestDataKey);
        case "request-raw":
          return context.req;
        case "response-raw":
          return context.res;
        // Note: The rest of these are variations of request-data, but they exist independently
        // so that the spec extractor can validate against them.
        case "openapi-security":
          // It should be safe to return undefined here, as the processor should have thrown if no scheme matched.
          return context.getRequestData(`openapi-security-${arg.schemeName}`);
        case "openapi-parameter":
          // It should be safe to return undefined here, as the processor should have thrown for required parameters.
          return context.getRequestData(
            `openapi-parameter-${arg.parameterName}`,
          );
        case "openapi-requestbody":
          // It should be safe to return undefined here, as the processor should have thrown for required bodies.
          return context.getRequestData("openapi-body");
        default:
          throw new Error(
            `Unknown handler argument type ${
              (arg as any).type
            } for operation ${nameOperationFromContext(context)}.`,
          );
      }
    });
  }
}
