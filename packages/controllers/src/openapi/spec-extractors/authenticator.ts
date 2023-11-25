import { getSOCAuthenticatorMetadata } from "../../metadata";
import { ControllerObject } from "../../types";
import { mergeCombineArrays } from "../../utils";

import { OpenAPIObjectExtractor } from "../types";
import {
  SOCAuthenticationExtensionData,
  SOCAuthenticatorExtensionName,
} from "../extensions";

export const extractSOCAuthenticatorSpec: OpenAPIObjectExtractor = (
  controller: ControllerObject,
) => {
  const metadata = getSOCAuthenticatorMetadata(controller);
  if (!metadata || !metadata.name || !metadata.openapiFragment) {
    return undefined;
  }

  const extensionData: SOCAuthenticationExtensionData = {
    controller,
    // This is fixed at the moment, but we might want to make these decorators targetable on methods inside classes, for the convienence.
    handler: "authenticate",
  };

  return mergeCombineArrays({}, metadata.openapiFragment, {
    components: {
      securitySchemes: {
        [metadata.name]: {
          [SOCAuthenticatorExtensionName]: extensionData,
        },
      },
    },
  });
};
