import { getSOCAuthenticatorMetadata } from "../../../metadata";

import { setMethodParameterType } from "./utils";

/**
 * Specifies that this argument receives a pre-defined security authorization handler result.
 * This decorator does NOT perform any validation or ensure that the security value is actually present.  These actions
 * will only be performed if the OpenAPI specification actually contains the security scheme in question.
 * @param scheme Either the name of the security scheme, or a class constructor defining a security scheme with `@Authenticator`
 */
export function BindSecurity(scheme: string | Function): ParameterDecorator {
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

  return (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) => {
    if (propertyKey === undefined) {
      throw new Error(`@BindSecurity() must be applied to a method argument.`);
    }

    setMethodParameterType(target, propertyKey, parameterIndex, {
      type: "openapi-security",
      schemeName,
    });
  };
}
