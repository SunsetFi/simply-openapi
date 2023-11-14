import { OperationObject } from "openapi3-ts/oas31";
import { PartialDeep } from "type-fest";

import { mergeSOCControllerMethodMetadata } from "../../metadata";

/**
 * Records additional OpenAPI operation schema information for this method.
 * @param fragment A partial fragment of an OpenAPI operation object.
 */
export function OpenAPIOperation(fragment: PartialDeep<OperationObject>) {
  return function (target: any, methodName: string | symbol) {
    if (!methodName) {
      throw new Error(`@OpenAPIOperation() must be applied to a method.`);
    }

    mergeSOCControllerMethodMetadata(
      target,
      { operationFragment: fragment },
      methodName,
    );
  };
}
