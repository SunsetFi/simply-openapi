import {
  SecurityRequirementObject,
  SecuritySchemeObject,
} from "openapi3-ts/oas31";
import { Unauthorized, isHttpError } from "http-errors";

import {
  SOCAuthenticationExtensionData,
  SOCAuthenticatorExtensionName,
} from "../../../openapi";

import { RequestContext } from "../handler-middleware";

import { RequestProcessorFactory } from "./types";
import { RequestProcessorFactoryContext } from "./RequestProcessorFactoryContext";

export const securityRequestProcessorFactory: RequestProcessorFactory = (
  ctx,
) => {
  const processor = new SecurityRequestProcessor(ctx);
  return processor.process.bind(processor);
};

class SecurityRequestProcessor {
  private _schemes: Record<string, SecuritySchemeObject>;
  private _securities: SecurityRequirementObject[];

  constructor(ctx: RequestProcessorFactoryContext) {
    this._schemes = ctx.securitySchemes;

    // TODO: Validate that all securities are defined.
    this._securities = ctx.securities;

    // TODO: We do a lot of lookup and validation at runtime.  Do this at factory time.
  }

  async process(ctx: RequestContext) {
    let desiredError: Error | undefined;
    for (const security of this._securities) {
      try {
        const result = await this._checkSecurityRequirements(security, ctx);
        if (result !== false) {
          return {
            security: result,
          };
        }
      } catch (e: any) {
        if (isHttpError(e)) {
          // Remember the error, but keep trying other security methods.
          desiredError = e;
          continue;
        }

        throw e;
      }
    }

    if (this._securities.length > 0) {
      throw (
        (this._securities.length === 1 && desiredError) || new Unauthorized()
      );
    }

    return {};
  }

  private async _checkSecurityRequirements(
    security: SecurityRequirementObject,
    ctx: RequestContext,
  ) {
    let result: Record<string, any> = {};
    for (const [key, scopes] of Object.entries(security)) {
      const securityResult = await this._checkSecurityRequirement(
        key,
        scopes,
        ctx,
      );
      if (Boolean(securityResult) === false) {
        return false;
      }

      result[key] = securityResult;
    }

    return result;
  }

  private _getSchemeValue(scheme: SecuritySchemeObject, ctx: RequestContext) {
    switch (scheme.type) {
      case "apiKey":
        return this._getApiKeySchemeValue(scheme, ctx);
      case "http":
        return this._getHttpSchemeValue(scheme, ctx);
      case "oauth2":
        return ctx.req.headers.authorization;
      case "openIdConnect":
        return ctx.req.headers.authorization;
    }
  }

  private _getHttpSchemeValue(
    scheme: SecuritySchemeObject,
    ctx: RequestContext,
  ) {
    const value = ctx.getHeader("authorization");
    if (!value || Array.isArray(value)) {
      throw new Unauthorized();
    }

    if (scheme.scheme === "basic") {
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

    if (scheme.scheme === "bearer") {
      if (!value.startsWith("Bearer ")) {
        throw new Unauthorized(
          `Invalid HTTP bearer authentication header "${value}".`,
        );
      }

      return value.slice(7);
    }

    throw new Error(`Unknown HTTP security scheme scheme "${scheme.scheme}".`);
  }

  private async _checkSecurityRequirement(
    schemeName: string,
    scopes: string[],
    ctx: RequestContext,
  ) {
    const scheme = this._schemes[schemeName];
    if (scheme == null) {
      throw new Error(`Unknown security scheme "${schemeName}"`);
    }

    const extension: SOCAuthenticationExtensionData =
      scheme[SOCAuthenticatorExtensionName];
    if (!extension) {
      throw new Error(
        `Security scheme "${schemeName}" does not have a security authenticator extension.`,
      );
    }

    const value = this._getSchemeValue(scheme, ctx);

    // FIXME: These really should be processed by the route factory and not here.
    const controller = extension.controller;
    let handler = extension.handler;
    if (typeof handler === "string" || typeof handler === "symbol") {
      handler = (controller as any)[handler];
    }

    if (typeof handler === "function") {
      return await handler.call(controller, value, scopes, ctx);
    } else {
      // FIXME: Determine this at factory time, not runtime.
      throw new Error(
        `Security scheme "${schemeName}" does not have a valid security authenticator.`,
      );
    }
  }

  private _getApiKeySchemeValue(
    scheme: SecuritySchemeObject,
    ctx: RequestContext,
  ) {
    if (scheme.type !== "apiKey") {
      throw new Error(
        `Security scheme "${scheme.name}" is not an API key security scheme.`,
      );
    }

    if (!scheme.name || scheme.name === "") {
      throw new Error(`Security scheme "${scheme.name}" does not have a name.`);
    }

    let value: any;
    switch (scheme.in) {
      case "header":
        value = ctx.getHeader(scheme.name);
        break;
      case "query":
        value = ctx.getQuery(scheme.name);
        break;
      case "cookie":
        value = ctx.getCookie(scheme.name);
        break;
      default:
        throw new Error(
          `Unknown API key security scheme location "${scheme.in}".`,
        );
    }

    if (value === undefined) {
      throw new Unauthorized();
    }

    return value;
  }
}
