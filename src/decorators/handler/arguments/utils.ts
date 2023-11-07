import { mergeSECControllerMethodMetadata } from "../../../metadata";
import { SECControllerMethodHandlerArg } from "../../../openapi";

export function setMethodParameterType(
  target: any,
  propertyKey: string | symbol,
  parameterIndex: number,
  arg: SECControllerMethodHandlerArg
) {
  mergeSECControllerMethodMetadata(
    target,
    (previous) => {
      const args = [...(previous.args ?? [])];
      if (args[parameterIndex].type) {
        throw new Error(
          `Method handler ${String(
            propertyKey
          )} cannot redefine the parameter type at index ${parameterIndex}.`
        );
      }

      args[parameterIndex] = arg;
      return {
        ...previous,
        args,
      };
    },
    propertyKey
  );
}
