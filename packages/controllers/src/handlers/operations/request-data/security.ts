import {
  SecurityRequirementObject,
  SecuritySchemeObject,
} from "openapi3-ts/oas31";
import { BadRequest } from "http-errors";

import {
  SOCAuthenticationExtensionData,
  SOCAuthenticatorExtensionName,
} from "../../../openapi";

import { RequestDataProcessorFactory } from "./types";

const singularSource = {
  headers: "header",
  query: "query parameter",
  cookies: "cookie",
};

export const securityRequestDataProcessorFactory: RequestDataProcessorFactory =
  (ctx) => {
    const securities = ctx.securities;
    const schemes = ctx.securitySchemes;

    return async (ctx) => {
      function getValue(source: "headers" | "query" | "cookies", name: string) {
        if (source === "headers") {
          name = name.toLowerCase();
        }

        const value = ctx.req[source][name];
        if (!value) {
          throw new BadRequest(
            `Missing security ${singularSource[source]} "${name}".`,
          );
        }

        return String(value);
      }

      function getApiKeySchemeValue(scheme: SecuritySchemeObject) {
        switch (scheme.in) {
          case "header":
            return getValue("headers", scheme.name!);
          case "query":
            return getValue("query", scheme.name!);
          case "cookie":
            return getValue("cookies", scheme.name!);
          default:
            throw new Error(
              `Unknown API key security scheme location "${scheme.in}".`,
            );
        }
      }

      function getHttpSchemeValue(scheme: SecuritySchemeObject) {
        if (scheme.scheme === "basic") {
          const value = getValue("headers", "authorization");
          if (!value.startsWith("Basic ")) {
            throw new BadRequest(
              `Invalid HTTP basic authentication header "${value}".`,
            );
          }

          const data = Buffer.from(value.slice(6), "base64").toString();
          const index = data.indexOf(":");
          if (index === -1) {
            throw new BadRequest(
              `Invalid HTTP basic authentication header "${value}".`,
            );
          }

          return {
            username: data.slice(0, index),
            password: data.slice(index + 1),
          };
        }

        if (scheme.scheme === "bearer") {
          const value = getValue("headers", "authorization");
          if (!value.startsWith("Bearer ")) {
            throw new BadRequest(
              `Invalid HTTP bearer authentication header "${value}".`,
            );
          }

          return value.slice(7);
        }

        throw new Error(
          `Unknown HTTP security scheme scheme "${scheme.scheme}".`,
        );
      }

      function getSchemeValue(scheme: SecuritySchemeObject) {
        switch (scheme.type) {
          case "apiKey":
            return getApiKeySchemeValue(scheme);
          case "http":
            return getHttpSchemeValue(scheme);
          case "oauth2":
            return ctx.req.headers.authorization;
          case "openIdConnect":
            return ctx.req.headers.authorization;
        }
      }

      async function checkSecurity(key: string, scopes: string[]) {
        const scheme = schemes[key];
        if (scheme == null) {
          throw new Error(`Unknown security scheme "${key}"`);
        }

        const extension: SOCAuthenticationExtensionData =
          scheme[SOCAuthenticatorExtensionName];
        if (!extension) {
          throw new Error(
            `Security scheme "${key}" does not have a security authenticator extension.`,
          );
        }

        const value = getSchemeValue(scheme);

        // FIXME: These really should be processed by the route factory and not here.
        const controller = extension.controller;
        let handler = extension.handler;
        if (typeof handler === "string" || typeof handler === "symbol") {
          handler = (controller as any)[handler];
        }

        if (typeof handler === "function") {
          return await handler.call(controller, value, scopes, ctx);
        } else {
          throw new Error(
            `Security scheme "${key}" does not have a valid security authenticator.`,
          );
        }
      }

      async function checkSecurityRequirements(
        security: SecurityRequirementObject,
      ) {
        let result: Record<string, any> = {};
        for (const [key, scopes] of Object.entries(security)) {
          const securityResult = await checkSecurity(key, scopes);
          if (Boolean(securityResult) === false) {
            return false;
          }

          result[key] = securityResult;
        }

        return result;
      }

      for (const security of securities) {
        const result = await checkSecurityRequirements(security);
        if (result !== false) {
          return {
            security: result,
          };
        }
      }

      return {};
    };
  };
