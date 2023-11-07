import { ResponseObject } from "../ResponseObject";
import {
  OperationHandlerMiddlewareContext,
  OperationHandlerMiddlewareNextFunction,
} from "../handler-types";
import { nameOperationFromContext } from "../utils/operations";

export async function operationHandlerResponseObjectMiddleware(
  context: OperationHandlerMiddlewareContext,
  next: OperationHandlerMiddlewareNextFunction
) {
  const result = await next();

  if (!(result instanceof ResponseObject)) {
    return result;
  }

  if (context.res.headersSent) {
    throw new Error(
      `Operation ${nameOperationFromContext(
        context
      )} handler returned a result but the request has already sent its headers.`
    );
  }

  result._apply(context.res);
  return undefined;
}
