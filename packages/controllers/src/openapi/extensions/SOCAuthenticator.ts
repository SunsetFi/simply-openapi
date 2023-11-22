import { IExtensionType } from "openapi3-ts/oas31";

import { ControllerObject } from "../../types";

/**
 * OpenAPI Specification Extension: x-simply-controller-authenticator
 * Stores metadata about the authenticator, so that routers may be built for it.
 */
export const SOCAuthenticatorExtensionName =
  "x-simply-controller-authenticator" satisfies IExtensionType;

/**
 * Data extending a security scheme that describes the controller and method which will handle the authorization.
 */
export interface SOCAuthenticationExtensionData {
  controller: ControllerObject;
  handler: string | symbol | Function;
}
