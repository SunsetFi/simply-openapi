import { nameOperationFromHandlerContext } from "./utils";

import {
  OperationHandlerMiddlewareContext,
  OperationHandlerMiddlewareNextFunction,
} from "./types";

export async function operationHandlerFallbackResponseMiddleware(
  context: OperationHandlerMiddlewareContext,
  next: OperationHandlerMiddlewareNextFunction,
) {
  const result = await next();

  const responseType = context.res.getHeader("content-type");

  if (result !== undefined) {
    throw new Error(
      `Operation ${nameOperationFromHandlerContext(
        context,
      )} returned a result that was not handled by any middleware, and was not sent back to the client.  Are you missing a handler middleware for ${
        responseType == null ? "your response" : `response type ${responseType}`
      }?`,
    );
  }

  if (!context.res.headersSent) {
    throw new Error(
      `Operation ${nameOperationFromHandlerContext(
        context,
      )} did not send a response for the handler result.  Are you missing a handler middleware for ${
        responseType == null ? "your response" : `response type ${responseType}`
      }?`,
    );
  }
}
