import { OperationObject } from "openapi3-ts/oas31";
import { PartialDeep } from "type-fest";

import {
  getSOCControllerMethodMetadata,
  isSOCBoundControllerMethodMetadata,
  setSOCControllerMethodMetadata,
} from "../../metadata";
import { mergeCombineArrays } from "../../utils";

/**
 * Records additional OpenAPI operation schema information for this method.
 * @param fragment A partial fragment of an OpenAPI operation object.
 */
export function OpenAPIOperation(fragment: PartialDeep<OperationObject>) {
  return function (target: any, methodName: string | symbol) {
    if (!methodName) {
      throw new Error(`@OpenAPIOperation() must be applied to a method.`);
    }

    const metadata = getSOCControllerMethodMetadata(target, methodName);
    if (metadata && isSOCBoundControllerMethodMetadata(metadata)) {
      throw new Error(
        `@OpenAPIOperation() cannot be applied to a bound controller method.`,
      );
    }

    // Mask the type as we know it's not a bound controller method,
    // but we may not have all the decorators yet and we are still partially building.
    const newMetadata: any = {
      ...(metadata ?? {}),
      operationFragment: mergeCombineArrays(
        metadata?.operationFragment ?? {},
        fragment,
      ),
    };

    setSOCControllerMethodMetadata(target, newMetadata, methodName);
  };
}
