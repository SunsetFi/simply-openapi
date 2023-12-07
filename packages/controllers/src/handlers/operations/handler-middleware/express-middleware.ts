import { Handler } from "express";
import {
  OperationHandlerMiddleware,
  OperationHandlerMiddlewareNextFunction,
} from "./types";
import { RequestContext } from "../../RequestContext";

export function convertExpressMiddleware(
  expressHandler: Handler,
): OperationHandlerMiddleware {
  return (
    context: RequestContext,
    next: OperationHandlerMiddlewareNextFunction,
  ) => {
    expressHandler(context.req, context.res, (err) => {
      if (err) {
        throw err;
      }

      next();
    });
  };
}
