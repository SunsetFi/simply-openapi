import { OperationObject } from "openapi3-ts/oas31";
import { PartialDeep } from "type-fest";

import {
  getSECControllerMetadata,
  mergeSECControllerMethodMetadata,
} from "../../metadata";

/**
 * Records additional OpenAPI operation schema information for this method.
 * @param fragment A partial fragment of an OpenAPI operation object.
 */
export function OpenAPIOperation(fragment: PartialDeep<OperationObject>) {
  return function (target: any, methodName: string | symbol | undefined) {
    if (!methodName) {
      throw new Error(`@OpenAPIOperation() must be applied to a method.`);
    }

    mergeSECControllerMethodMetadata(
      target,
      { operationFragment: fragment },
      methodName
    );
  };
}

/**
 * Marks this method has handling a specific OpenAPI operation by its operation id.
 * @param operationId The operation id to bind this method to.
 */
export function BindOperation(operationId: string) {
  return function (target: any, methodName: string | symbol | undefined) {
    if (!methodName) {
      throw new Error(`@BindOperation() must be applied to a method.`);
    }

    const existing = getSECControllerMetadata(target);
    if (existing?.path) {
      throw new Error(
        `Controller ${target.constructor.name} method ${String(
          methodName
        )} cannot both be bound to an operation and have http methods specified.`
      );
    }

    if (existing?.openapiFragment) {
      throw new Error(
        `Controller ${target.constructor.name} method ${String(
          methodName
        )} cannot both be bound to an operation and have openapi fragments specified.  This may happen if you have used @PathParam or @QueryParam instead of @BoundParam`
      );
    }

    mergeSECControllerMethodMetadata(target, { operationId }, methodName);
  };
}
