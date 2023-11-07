import { OperationObject } from "openapi3-ts/oas31";
import { PartialDeep } from "type-fest";

import { mergeSECControllerMethodMetadata } from "../../metadata";

export function OpenAPIOperation(fragment: PartialDeep<OperationObject>) {
  return function (target: any, methodName: string) {
    mergeSECControllerMethodMetadata(
      target,
      { operationFragment: fragment },
      methodName
    );
  };
}
