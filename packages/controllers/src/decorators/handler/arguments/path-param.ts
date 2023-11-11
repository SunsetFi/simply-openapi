import { BaseParameterObject } from "openapi3-ts/oas31";

import { mergeSOCControllerMethodMetadata } from "../../../metadata";

import { setMethodParameterType } from "./utils";

export type PathParameterSpec = BaseParameterObject;

/**
 * Defines a path parameter in the OpenAPI spec and registers it to pass to this method argument.
 * @param name The name of the parameter.
 * @param spec The specification of the OpenAPI parameter.
 */
export function PathParam(
  name: string,
  spec?: Partial<PathParameterSpec>
): ParameterDecorator {
  return (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex: number
  ) => {
    if (propertyKey === undefined) {
      throw new Error(`@PathParam() must be applied to a method.`);
    }

    // Warn: We might be a bound method.  In which case, operationFragment will be totally ignored.
    mergeSOCControllerMethodMetadata(
      target,
      {
        operationFragment: {
          parameters: [
            {
              in: "path",
              name,
              ...(spec ?? {}),
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
