import { RequestDataProcessorFactoryContext } from "./RequestDataProcessorFactoryContext";

export function nameOperationFromRequestProcessorContext(
  context: RequestDataProcessorFactoryContext,
) {
  return context.operation.operationId ?? `${context.method} ${context.path}`;
}
