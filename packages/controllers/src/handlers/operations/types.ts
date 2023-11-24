import { SOCControllerMethodHandlerArg } from "../../openapi";

export type OperationHandlerArgumentDefinitions = (
  | SOCControllerMethodHandlerArg
  | undefined
)[];

export interface CommonExtractedRequestData {
  parameters: Record<string, any>;
  body: any;
  security: Record<string, any>;
}
export type ExtractedRequestExtensionName = `x-${string}`;
export type RequestData = CommonExtractedRequestData & {
  [extensionName: ExtractedRequestExtensionName]: any;
};
export function isExtractedRequestExtensionName(
  name: string,
): name is ExtractedRequestExtensionName {
  return name.startsWith("x-");
}
