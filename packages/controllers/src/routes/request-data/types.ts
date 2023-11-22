import { Request } from "express";

import { ExtractedRequestData } from "../../types";

import { RequestDataProcessorFactoryContext } from "./RequestDataProcessorFactoryContext";

export type ValueProcessorFunction = (value: any) => any;
/**
 * Context information for producing a request data processor.
 */

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
