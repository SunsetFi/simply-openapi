import { RequestDataKey } from "../../../handlers/request-data";

import { setMethodParameterType } from "./utils";

/**
 * Specifies that this argument receives request data extracted by a handler.
 * @param key The key of the request.
 */
export function BindRequestData(key: RequestDataKey): ParameterDecorator {
  return (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) => {
    if (propertyKey === undefined) {
      throw new Error(`@BindRequestData() must be applied to a method.`);
    }

    setMethodParameterType(target, propertyKey, parameterIndex, {
      type: "request-data",
      requestDataKey: key,
    });
  };
}
