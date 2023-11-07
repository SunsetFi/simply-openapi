import { BaseParameterObject } from "openapi3-ts/oas31";

import { mergeSECControllerMethodMetadata } from "../../../metadata";

import { setMethodParameterType } from "./utils";

export type QueryParameterSettings = BaseParameterObject;

/**
 * Defines a query parameter in the OpenAPI spec and registers it to pass to this method argument.
 * @param name The name of the parameter.
 * @param spec The specification of the OpenAPI parameter.
 */
export function QueryParam(
  name: string,
  settings?: Partial<QueryParameterSettings>
): ParameterDecorator {
  return (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex: number
  ) => {
    if (propertyKey === undefined) {
      throw new Error(`@QueryParam() must be applied to a method.`);
    }

    // Warn: We might be a bound method.  In which case, operationFragment will be totally ignored.
    mergeSECControllerMethodMetadata(
      target,
      {
        operationFragment: {
          parameters: [
            {
              in: "query",
              name,
              ...(settings ?? {}),
            },
          ],
        },
      },
      propertyKey
    );
    setMethodParameterType(target, propertyKey, parameterIndex, {
      type: "openapi-parameter",
      parameterName: name,
    });
  };
}
