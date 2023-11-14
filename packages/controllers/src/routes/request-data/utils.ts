import { RequestDataProcessorFactoryContext } from "./types";

export function nameOperationFromRequestProcessorContext(
  context: RequestDataProcessorFactoryContext,
) {
  return context.operation.operationId ?? `${context.method} ${context.path}`;
}
