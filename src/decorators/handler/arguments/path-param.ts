import { BaseParameterObject } from "openapi3-ts/oas31";

import { mergeSECControllerMethodMetadata } from "../../../metadata";

import { setMethodParameterType } from "./utils";

export type PathParameterSettings = BaseParameterObject;

export function PathParam(
  name: string,
  settings?: Partial<PathParameterSettings>
) {
  return (target: any, propertyKey: string, parameterIndex: number) => {
    mergeSECControllerMethodMetadata(
      target,
      {
        operationFragment: {
          parameters: [
            {
              in: "path",
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
