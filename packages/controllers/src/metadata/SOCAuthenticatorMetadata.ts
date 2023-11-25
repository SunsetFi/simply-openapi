import { OpenAPIObject } from "openapi3-ts/oas31";
import { PartialDeep } from "type-fest";

import { ControllerObject } from "../types";
import { mergeCombineArrays } from "../utils";

import { defineConstructorMetadata, getConstructorMetadata } from "./reflect";

const SOCAuthenticatorMetadataKey = "soc:authenticator";

export interface SOCAuthenticatorMetadata {
  name?: string;
  openapiFragment?: PartialDeep<OpenAPIObject>;
}

export function mergeSOCAuthenticatorMetadata(
  target: any,
  metadata:
    | PartialDeep<SOCAuthenticatorMetadata>
    | ((
        previous: PartialDeep<SOCAuthenticatorMetadata>,
      ) => PartialDeep<SOCAuthenticatorMetadata>),
) {
  if (typeof metadata === "function") {
    metadata = metadata(getSOCAuthenticatorMetadata(target) ?? {});
    defineConstructorMetadata(SOCAuthenticatorMetadataKey, metadata, target);
  } else {
    const previous = getSOCAuthenticatorMetadata(target) ?? {};
    defineConstructorMetadata(
      SOCAuthenticatorMetadataKey,
      mergeCombineArrays(previous, metadata),
      target,
    );
  }
}

export function setSOCAuthenticatorMetadata(
  target: any,
  metadata: SOCAuthenticatorMetadata,
) {
  defineConstructorMetadata(SOCAuthenticatorMetadataKey, metadata, target);
}

export function getSOCAuthenticatorMetadata(
  target: ControllerObject,
): SOCAuthenticatorMetadata | null {
  return getConstructorMetadata(SOCAuthenticatorMetadataKey, target) ?? null;
}
