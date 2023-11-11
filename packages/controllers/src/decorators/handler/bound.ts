import {
  SOCCustomControllerMetadata,
  getSOCControllerMetadata,
  mergeSOCControllerMethodMetadata,
} from "../../metadata";

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

    const metadata = getSOCControllerMetadata(target);
    if (metadata && (metadata as SOCCustomControllerMetadata).openapiFragment) {
      throw new Error(
        `@BindOperation() cannot be used on methods that also are bound to produce OpenAPI specs.  Did you try to mix it with @OpenAPIOperation, @PathParam, @QueryParam, or a method decorator?`
      );
    }

    mergeSOCControllerMethodMetadata(target, { operationId }, methodName);
  };
}
