import { OperationHandlerMiddlewareContext } from "./handler-types";

export function nameOperationFromContext(
  context: OperationHandlerMiddlewareContext
) {
  return (
    context.operation.operationId ?? `${context.req.method} ${context.req.url}`
  );
}
