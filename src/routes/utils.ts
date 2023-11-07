import { OperationHandlerMiddlewareContext } from "../openapi";

export function nameOperationFromContext(
  context: OperationHandlerMiddlewareContext
) {
  return (
    context.operation.operationId ?? `${context.req.method} ${context.req.url}`
  );
}
