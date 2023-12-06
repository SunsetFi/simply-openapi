import { PartialDeep } from "type-fest";
import { OperationObject } from "openapi3-ts/oas31";

import {
  SOCControllerMethodMetadata,
  SOCCustomControllerMethodMetadata,
  getSOCAuthenticatorMetadata,
  getSOCControllerMethodMetadata,
  mergeSOCControllerMetadata,
  mergeSOCControllerMethodMetadata,
  setSOCControllerMethodMetadata,
} from "../../metadata";

export function RequireAuthentication(
  scheme: string | Function,
  scopes?: string[],
) {
  let schemeName: string = scheme as any;
  if (typeof scheme === "function") {
    const schemeControllerMetadata = getSOCAuthenticatorMetadata(scheme);
    if (
      !schemeControllerMetadata ||
      schemeControllerMetadata.name == undefined ||
      schemeControllerMetadata.name === ""
    ) {
      throw new Error(
        `Cannot require authentication from ${scheme.name} as it is not an authentication controller.`,
      );
    }

    schemeName = schemeControllerMetadata.name;
  }

  return function (
    target: any,
    propertyKey?: string | symbol,
    parameterIndex?: number | TypedPropertyDescriptor<any>,
  ) {
    const operationFragment: PartialDeep<OperationObject> = {
      security: [
        {
          [schemeName]: scopes ?? [],
        },
      ],
    };

    if (propertyKey) {
      const metadata = getSOCControllerMethodMetadata(
        target,
        propertyKey,
      ) as SOCCustomControllerMethodMetadata | null;

      const handlerArgs = metadata?.handlerArgs ?? [];
      if (typeof parameterIndex === "number") {
        handlerArgs[parameterIndex] = {
          type: "openapi-security",
          schemeName,
        };
      }

      const newMetadata: SOCCustomControllerMethodMetadata = {
        ...metadata,
        operationFragment: {
          ...metadata?.operationFragment,
          ...operationFragment,
        },
        handlerArgs,
      };

      setSOCControllerMethodMetadata(target, newMetadata, propertyKey);
    } else {
      mergeSOCControllerMetadata(target, {
        sharedOperationFragment: operationFragment,
      });
    }
  };
}
