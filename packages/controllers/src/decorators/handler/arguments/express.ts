import { setMethodParameterType } from "./utils";

export function Req() {
  return (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) => {
    if (propertyKey === undefined) {
      throw new Error(`@Req() must be applied to a method.`);
    }

    setMethodParameterType(target, propertyKey, parameterIndex, {
      type: "request-raw",
    });
  };
}

export function Res() {
  return (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) => {
    if (propertyKey === undefined) {
      throw new Error(`@Res() must be applied to a method argument.`);
    }

    setMethodParameterType(target, propertyKey, parameterIndex, {
      type: "response-raw",
    });
  };
}
