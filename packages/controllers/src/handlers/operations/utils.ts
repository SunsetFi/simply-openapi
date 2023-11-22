import { OperationContext } from "./OperationContext";

export function nameOperationFromContext(context: OperationContext) {
  return context.operation.operationId ?? `${context.method} ${context.path}`;
}
