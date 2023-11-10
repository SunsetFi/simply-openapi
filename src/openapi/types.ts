import { OpenAPIObject } from "openapi3-ts/oas31";

export type ControllerInstance = object;

export type OpenAPIObjectExtractor = (
  controller: ControllerInstance,
  methodName: string | symbol
) =>
  | OpenAPIObject
  | ((operation: OpenAPIObject) => OpenAPIObject)
  | null
  | undefined;
