import { OpenAPIObject } from "openapi3-ts/oas31";
import { ControllerObject } from "../types";

export type OpenAPIObjectExtractor = (
  controller: ControllerObject,
  methodName: string | symbol
) =>
  | Partial<OpenAPIObject>
  | ((operation: OpenAPIObject) => OpenAPIObject)
  | null
  | undefined;
