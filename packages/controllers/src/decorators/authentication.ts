import { SecuritySchemeObject } from "openapi3-ts/oas31";

import { setSOCAuthenticatorMetadata } from "../metadata";

export function Authenticator(name: string, scheme: SecuritySchemeObject) {
  if (!name || name === "") {
    throw new Error(`Authenticator name cannot be empty.`);
  }

  return function (target: any) {
    setSOCAuthenticatorMetadata(target, {
      name,
      openapiFragment: {
        components: {
          securitySchemes: {
            [name]: scheme,
          },
        },
      },
    });
  };
}
