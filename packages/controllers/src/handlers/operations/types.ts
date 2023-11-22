import { SOCControllerMethodHandlerArg } from "../../openapi";

export type OperationHandlerArgumentDefinitions = (
  | SOCControllerMethodHandlerArg
  | undefined
)[];
