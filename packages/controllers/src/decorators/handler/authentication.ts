import {
  getSOCAuthenticatorMetadata,
  mergeSOCControllerMethodMetadata,
} from "../../metadata";

export function RequireAuthentication(
  scheme: string | Function,
  scopes?: string[],
) {
  let schemeName: string = scheme as any;
  if (typeof scheme === "function") {
    const metadata = getSOCAuthenticatorMetadata(scheme);
    if (!metadata || metadata.name == undefined || metadata.name === "") {
      throw new Error(
        `Cannot require authentication from ${scheme.name} as it is not an authentication controller.`,
      );
    }

    schemeName = metadata.name;
  }

  return function (target: any, propertyKey: string) {
    // TODO: Allow targeting controllers.  This will have to store a per-method openapi fragment that needs to be merged into all containing methods,
    // as controllers as a concept do not exist in OpenAPI.
    mergeSOCControllerMethodMetadata(
      target,
      {
        operationFragment: {
          security: [
            {
              [schemeName]: scopes ?? [],
            },
          ],
        },
      },
      propertyKey,
    );
  };
}
