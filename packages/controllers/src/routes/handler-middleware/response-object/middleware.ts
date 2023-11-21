import { nameOperationFromHandlerContext } from "../utils";

import {
  OperationHandlerMiddlewareContext,
  OperationHandlerMiddlewareNextFunction,
} from "../types";

import { HandlerResult } from "./HandlerResult";

export async function operationHandlerResponseObjectMiddleware(
  context: OperationHandlerMiddlewareContext,
  next: OperationHandlerMiddlewareNextFunction,
) {
  const result = await next();

  if (!(result instanceof HandlerResult)) {
    return result;
  }

  if (context.res.headersSent) {
    throw new Error(
      `Operation ${nameOperationFromHandlerContext(
        context,
      )} handler returned a result but the request has already sent its headers.`,
    );
  }

  result._apply(context.res);
  return undefined;
}
