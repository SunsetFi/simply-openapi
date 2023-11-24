import {
  Authenticator,
  AuthenticationController,
  RequestContext,
} from "@simply-openapi/controllers";

@Authenticator("apiKey", {
  type: "apiKey",
  name: "x-api-key",
  in: "header",
})
export class WidgetAuthenticator implements AuthenticationController {
  authenticate(value: any, scopes: string[], ctx: RequestContext) {
    if (value === "swordfish") {
      // This can be anything to describe your user.  Any non-false response is considered successful authentication.
      return { authenticated: true };
    }

    return false;
  }
}
