import { setMethodParameterType } from "./utils";

/**
 * Specifies that this argument receives a pre-defined security authorization handler result.
 * This decorator does NOT perform any validation or ensure that the security value is actually present.  These actions
 * will only be performed if the OpenAPI specification actually contains the security scheme in question.
 * @param schemeName The name of the security scheme.
 */
export function BindSecurity(schemeName: string): ParameterDecorator {
  return (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) => {
    if (propertyKey === undefined) {
      throw new Error(`@BindParam() must be applied to a method.`);
    }

    setMethodParameterType(target, propertyKey, parameterIndex, {
      type: "openapi-security",
      schemeName,
    });
  };
}
