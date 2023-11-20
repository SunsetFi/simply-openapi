import { ErrorRequestHandler, RequestHandler } from "express";
import { requestMethods } from "./utils";
import { Constructor } from "type-fest";

export type RequestMethod = (typeof requestMethods)[number];

export type Middleware = RequestHandler | ErrorRequestHandler;

export type ControllerObject = object | Constructor<any>;
export type ControllerInstance = object;

export interface CommonExtractedRequestData {
  parameters: Record<string, any>;
  body: any;
}
export type ExtractedRequestExtensionName = `x-${string}`;
export type ExtractedRequestData = CommonExtractedRequestData & {
  [extensionName: ExtractedRequestExtensionName]: any;
};
export function isExtractedRequestExtensionName(
  name: string,
): name is ExtractedRequestExtensionName {
  return name.startsWith("x-");
}
