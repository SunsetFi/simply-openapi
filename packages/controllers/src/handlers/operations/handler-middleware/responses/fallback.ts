import { OperationRequestContext } from "../../../OperationRequestContext";

import { nameOperationFromContext } from "../../utils";

import { OperationMiddlewareNextFunction } from "../types";

export async function operationHandlerFallbackResponseMiddleware(
  context: OperationRequestContext,
  next: OperationMiddlewareNextFunction,
) {
  const result = await next();

  const responseType = context.res.getHeader("content-type");
  const responseTypeMessageFragment =
    responseType === "null"
      ? "your response "
      : `response type ${responseType}`;

  if (result !== undefined) {
    throw new Error(
      `Operation ${nameOperationFromContext(
        context,
      )} returned a result that was not handled by any middleware, and was not sent back to the client.  Are you missing a handler middleware for ${responseTypeMessageFragment}?`,
    );
  }

  if (!context.res.headersSent) {
    throw new Error(
      `Operation ${nameOperationFromContext(
        context,
      )} did not send a response for the handler result.  Are you missing a handler middleware for ${responseTypeMessageFragment}?`,
    );
  }
}
