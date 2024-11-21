import { nameOperationFromContext } from "../../../utils";

import { OperationMiddlewareNextFunction } from "../../types";
import { OperationRequestContext } from "../../../../OperationRequestContext";

import { HandlerResult } from "./HandlerResult";

export async function operationHandlerResponseObjectMiddleware(
  context: OperationRequestContext,
  next: OperationMiddlewareNextFunction,
) {
  const result = await next();

  if (!(result instanceof HandlerResult)) {
    return result;
  }

  if (context.res.headersSent) {
    throw new Error(
      `Operation ${nameOperationFromContext(
        context,
      )} handler returned a result but the request has already sent its headers.`,
    );
  }

  result._apply(context.res);
  return undefined;
}
