import { OperationObject } from "openapi3-ts/oas31";
import { PartialDeep } from "type-fest";

import {
  SOCControllerMetadata,
  SOCCustomControllerMetadata,
  SOCCustomControllerMethodMetadata,
  getSOCControllerMetadata,
  getSOCControllerMethodMetadata,
  isSOCBoundControllerMethodMetadata,
  setSOCControllerMetadata,
  setSOCControllerMethodMetadata,
} from "../../metadata";
import { mergeCombineArrays } from "../../utils";

/**
 * Records additional OpenAPI operation schema information for this method.
 * @param fragment A partial fragment of an OpenAPI operation object.
 */
export function OpenAPIOperation(fragment: PartialDeep<OperationObject>) {
  return function (target: any, methodName?: string | symbol) {
    if (methodName) {
      const metadata = getSOCControllerMethodMetadata(target, methodName);
      if (metadata && isSOCBoundControllerMethodMetadata(metadata)) {
        throw new Error(
          `@OpenAPIOperation() cannot be applied to a bound controller method.`,
        );
      }

      // Mask the type as we know it's not a bound controller method,
      // but we may not have all the decorators yet and we are still partially building.
      const newMetadata: SOCCustomControllerMethodMetadata = {
        ...(metadata ?? {}),
        operationFragment: mergeCombineArrays(
          (metadata as any)?.operationFragment ?? {},
          fragment,
        ),
      };

      setSOCControllerMethodMetadata(target, newMetadata, methodName);
    } else {
      const metadata = getSOCControllerMetadata(target);
      if (metadata && metadata?.type === "bound") {
        throw new Error(
          `@OpenAPIOperation() cannot be applied to a bound controller.`,
        );
      }

      const newMetadata: SOCCustomControllerMetadata = {
        ...((metadata as any) ?? {}),
        sharedOperationFragment: mergeCombineArrays(
          (metadata as any)?.operationFragment ?? {},
          fragment,
        ),
      };

      setSOCControllerMetadata(target, newMetadata);
    }
  };
}
