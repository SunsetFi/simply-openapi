import { setMethodParameterType } from "./utils";

export function Req() {
  return (target: any, propertyKey: string, parameterIndex: number) => {
    setMethodParameterType(target, propertyKey, parameterIndex, {
      type: "http-request",
    });
  };
}

export function Res() {
  return (target: any, propertyKey: string, parameterIndex: number) => {
    setMethodParameterType(target, propertyKey, parameterIndex, {
      type: "http-response",
    });
  };
}
