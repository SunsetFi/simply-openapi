import { setMethodParameterType } from "./utils";

/**
 * Specifies that this argument receives a pre-defined OpenAPI parameter.
 * @param name The name of the parameter.
 */
export function BindParam(name: string): ParameterDecorator {
  return (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex: number
  ) => {
    if (propertyKey === undefined) {
      throw new Error(`@BindParam() must be applied to a method.`);
    }

    setMethodParameterType(target, propertyKey, parameterIndex, {
      type: "openapi-parameter",
      parameterName: name,
    });
  };
}
