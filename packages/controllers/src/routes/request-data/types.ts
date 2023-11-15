import {
  OpenAPIObject,
  OperationObject,
  PathItemObject,
  SchemaObject,
} from "openapi3-ts/oas31";
import { Request } from "express";

import { ExtractedRequestData } from "../../types";

export type ValueProcessorFunction = (value: any) => any;
/**
 * Context information for producing a request data processor.
 */
export interface RequestDataProcessorFactoryContext {
  /**
   * The OpenAPI specification object.
   */
  spec: OpenAPIObject;

  /**
   * The full path of this operation.
   */
  path: string;

  /**
   * The HTTP method of this operation.
   */
  method: string;

  /**
   * The OpenAPI path item object.
   */
  pathItem: PathItemObject;

  /**
   * The OpenAPI operation object.
   */
  operation: OperationObject;

  /**
   * The controller class that contains the handler.
   * This should be the `this` object of the handler.
   */
  controller: object;

  /**
   * The handler function that will process the request.
   */
  handler: Function;

  /**
   * Create a value processor function with the given schema.
   * The returned function will validate the value against the schema, and may coerce it depending on user settings.
   * @param schema The schema to produce a validator for.
   * @throws {ValidationError} The value does not conform to the schema.
   */
  createValueProcessor(schema: SchemaObject): ValueProcessorFunction;
}

/**
 * A factory function for creating a function that will both validate and extract data from a request made to an OpenAPI operation.
 */
export type RequestDataProcessorFactory = (
  ctx: RequestDataProcessorFactoryContext,
) => RequestDataProcessor | null | undefined;

/**
 * A function that will both validate and extract data from a request made to an OpenAPI operation.
 *
 * This function should throw an http-error if the request does not conform to the OpenAPI specification for which it was generated.
 * This function may coerce the request data to conform to the OpenAPI specification.
 *
 * The function can return either a partial ExtractedRequestData object, which will be merged,
 * or a function that takes the previous ExtractedRequestData object and returns a new ExtractedRequestData to use.
 */
export type RequestDataProcessor = (
  req: Request,
) =>
  | Partial<ExtractedRequestData>
  | ((previous: ExtractedRequestData) => ExtractedRequestData);
