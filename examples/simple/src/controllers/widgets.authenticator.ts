import {
  Authenticator,
  AuthenticationController,
  RequestContext,
} from "@simply-openapi/controllers";
import { Unauthorized } from "http-errors";

export interface AuthenticatedUser {
  apiKey: string;
}

@Authenticator("apiKey", {
  type: "apiKey",
  name: "x-api-key",
  in: "header",
})
export class WidgetAuthenticator implements AuthenticationController {
  authenticate(value: any, scopes: string[], ctx: RequestContext) {
    if (value !== "swordfish" && value !== "marlin") {
      // Returning false indicates that the authentication has failed.
      return false;
    }

    if (scopes.includes("widgets:write") && value !== "marlin") {
      // Alternatively to returning false, any http-error derived error can be thrown.
      throw new Unauthorized("Insufficient permissions");
    }

    return { apiKey: value } satisfies AuthenticatedUser;
  }
}
