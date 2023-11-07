import { setMethodParameterType } from "./utils";

/**
 * Specifies that this argument receives a pre-defined OpenAPI parameter.
 * @param name The name of the parameter.
 */
export function BindParam(name: string) {
  return (target: any, propertyKey: string, parameterIndex: number) => {
    setMethodParameterType(target, propertyKey, parameterIndex, {
      type: "openapi-parameter",
      parameterName: name,
    });
  };
}
