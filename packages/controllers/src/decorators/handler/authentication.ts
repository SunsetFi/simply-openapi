import { PartialDeep } from "type-fest";
import { OperationObject } from "openapi3-ts/oas31";

import {
  getSOCAuthenticatorMetadata,
  mergeSOCControllerMetadata,
  mergeSOCControllerMethodMetadata,
} from "../../metadata";

export function RequireAuthentication(
  scheme: string | Function,
  scopes?: string[],
) {
  let schemeName: string = scheme as any;
  if (typeof scheme === "function") {
    const metadata = getSOCAuthenticatorMetadata(scheme);
    if (!metadata || metadata.name == undefined || metadata.name === "") {
      throw new Error(
        `Cannot require authentication from ${scheme.name} as it is not an authentication controller.`,
      );
    }

    schemeName = metadata.name;
  }

  return function (target: any, propertyKey?: string) {
    const operationFragment: PartialDeep<OperationObject> = {
      security: [
        {
          [schemeName]: scopes ?? [],
        },
      ],
    };

    if (propertyKey) {
      mergeSOCControllerMethodMetadata(
        target,
        {
          operationFragment,
        },
        propertyKey,
      );
    } else {
      mergeSOCControllerMetadata(target, {
        sharedOperationFragment: operationFragment,
      });
    }
  };
}
