import { mergeSOCControllerMethodMetadata } from "../../metadata";

/**
 * Marks this method has handling a specific OpenAPI operation by its operation id.
 * @param operationId The operation id to bind this method to.
 */
export function BindOperation(operationId: string) {
  return function (target: any, methodName: string | symbol | undefined) {
    if (!methodName) {
      throw new Error(`@BindOperation() must be applied to a method.`);
    }

    // Early on we considered not letting this be used on path controllers, but I am allowing it for cases
    // where mixed external and internal openapi definitions are desired.

    mergeSOCControllerMethodMetadata(target, { operationId }, methodName);
  };
}
