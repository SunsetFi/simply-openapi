import { OperationHandlerMiddlewareContext } from "./types";

export function nameOperationFromHandlerContext(
  context: OperationHandlerMiddlewareContext,
) {
  return (
    context.operation.operationId ?? `${context.req.method} ${context.req.url}`
  );
}
