import { SecuritySchemeObject } from "openapi3-ts/oas31";
import { Unauthorized } from "http-errors";

import { RequestContext } from "../../handler-middleware";

import { SecurityRequirementProcessor } from "./SecurityRequirementProcessor";

export class HttpRequirementProcessor extends SecurityRequirementProcessor {
  constructor(
    schemeKey: string,
    scheme: SecuritySchemeObject,
    scopes: string[],
  ) {
    if (scheme.type !== "http") {
      throw new Error("Invalid security scheme type.");
    }

    if (!scheme.scheme) {
      throw new Error("API key security scheme does not have a scheme.");
    }

    if (!["basic", "bearer"].includes(scheme.scheme)) {
      throw new Error(
        `Unknown API key security scheme scheme "${scheme.scheme}".`,
      );
    }

    super(schemeKey, scheme, scopes);
  }

  protected _getValue(ctx: RequestContext) {
    const value = ctx.getHeader("authorization");
    if (!value || Array.isArray(value)) {
      return undefined;
    }

    if (this.scheme.scheme === "basic") {
      if (!value.startsWith("Basic ")) {
        throw new Unauthorized(
          `Invalid HTTP basic authentication header "${value}".`,
        );
      }

      const data = Buffer.from(value.slice(6), "base64").toString();
      const index = data.indexOf(":");
      if (index === -1) {
        throw new Unauthorized(
          `Invalid HTTP basic authentication header "${value}".`,
        );
      }

      return {
        username: data.slice(0, index),
        password: data.slice(index + 1),
      };
    }

    if (this.scheme.scheme === "bearer") {
      if (!value.startsWith("Bearer ")) {
        throw new Unauthorized(
          `Invalid HTTP bearer authentication header "${value}".`,
        );
      }

      return value.slice(7);
    }

    return undefined;
  }
}
