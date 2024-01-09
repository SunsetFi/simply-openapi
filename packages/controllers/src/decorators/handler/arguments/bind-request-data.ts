import { RequestDataKey } from "../../../handlers/request-data";

import { setMethodParameterType } from "./utils";

/**
 * Specifies that this argument receives request data extracted by a handler.
 * @param requestDataKey The key of the request data.
 */
export function BindRequestData(
  requestDataKey: RequestDataKey,
): ParameterDecorator {
  return (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) => {
    if (propertyKey === undefined) {
      throw new Error(
        `@BindRequestData() must be applied to a method argument.`,
      );
    }

    setMethodParameterType(target, propertyKey, parameterIndex, {
      type: "request-data",
      requestDataKey,
    });
  };
}

/**
 * Creates a decorator function that binds a request data key to a method argument.
 * @param requestDataKey The key of the request data.
 * @returns A decorator function that can bind a controller method argument to the given request data key.
 */
export function createRequestDataDecorator(requestDataKey: RequestDataKey) {
  return BindRequestData(requestDataKey);
}
