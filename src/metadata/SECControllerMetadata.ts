import { OpenAPIObject } from "openapi3-ts/oas31";
import { PartialDeep } from "type-fest";

import { defineMetadata, getMetadata, mergeMetadata } from "./reflect";

const SECControllerMetadataKey = "sec:controller";

export interface SECControllerMetadata {
  path?: string;
  openapiFragment?: PartialDeep<OpenAPIObject>;
}

export function mergeSECControllerMetadata(
  target: any,
  metadata: PartialDeep<SECControllerMetadata>
) {
  mergeMetadata(SECControllerMetadataKey, metadata, target);
}

export function setSECControllerMetadata(
  target: any,
  metadata: SECControllerMetadata
) {
  defineMetadata(SECControllerMetadataKey, metadata, target);
}

export function getSECControllerMetadata(
  target: any
): SECControllerMetadata | null {
  return getMetadata(SECControllerMetadataKey, target) ?? null;
}
