import { PartialDeep } from "type-fest";
import { OpenAPIObject } from "openapi3-ts/oas31";

import { ControllerObject } from "../types";

export type OpenAPIObjectExtractorResult =
  | PartialDeep<OpenAPIObject>
  | ((operation: OpenAPIObject) => OpenAPIObject)
  | null
  | undefined;

export type OpenAPIObjectMethodExtractor = (
  controller: ControllerObject,
  methodName: string | symbol,
) => OpenAPIObjectExtractorResult;

export function isOpenAPIObjectMethodExtractor(
  extractor: OpenAPIObjectExtractor,
): extractor is OpenAPIObjectMethodExtractor {
  return extractor.length === 2;
}

export type OpenAPIObjectControllerExtractor = (
  controller: ControllerObject,
) => OpenAPIObjectExtractorResult;
export function isOpenAPIObjectControllerExtractor(
  extractor: OpenAPIObjectExtractor,
): extractor is OpenAPIObjectControllerExtractor {
  return extractor.length === 1;
}

export type OpenAPIObjectExtractor =
  | OpenAPIObjectMethodExtractor
  | OpenAPIObjectControllerExtractor;
