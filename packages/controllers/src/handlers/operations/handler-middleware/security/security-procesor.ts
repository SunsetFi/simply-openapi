import { Unauthorized, isHttpError } from "http-errors";

import { OperationRequestContext } from "../../../OperationRequestContext";

import { nameOperationFromContext } from "../../utils";

import { OperationMiddlewareFactoryContext } from "../OperationMiddlewareFactoryContext";
import {
  OperationMiddlewareFactory,
  OperationMiddlewareNextFunction,
} from "../types";

import { ApiKeyRequirementProcessor } from "./ApiKeyRequirementProcessor";
import { HttpRequirementProcessor } from "./HttpRequirementProcessor";
import { SecurityRequirementProcessor } from "./SecurityRequirementProcessor";

export const securityProcessorMiddlewareFactory: OperationMiddlewareFactory = (
  ctx,
) => {
  const processors = collectSecurityRequirementProcessors(ctx);
  return async (
    reqCtx: OperationRequestContext,
    next: OperationMiddlewareNextFunction,
  ) => {
    await applySecurityRequirements(reqCtx, processors);
    return next();
  };
};

function collectSecurityRequirementProcessors(
  ctx: OperationMiddlewareFactoryContext,
) {
  const schemes = ctx.securitySchemes;

  return ctx.securities.map((security) =>
    Object.entries(security).map(([key, scopes]) => {
      const scheme = schemes[key];
      if (scheme == null) {
        throw new Error(
          `Unknown security scheme "${key}" defined in ${nameOperationFromContext(
            ctx,
          )}`,
        );
      }

      switch (scheme.type) {
        case "apiKey":
          return new ApiKeyRequirementProcessor(key, scheme, scopes);
        case "http":
          return new HttpRequirementProcessor(key, scheme, scopes);
        default:
          throw new Error(
            `Unknown security scheme type "${
              scheme.type
            }" defined in ${nameOperationFromContext(ctx)}`,
          );
      }
    }),
  );
}

async function applySecurityRequirements(
  ctx: OperationRequestContext,
  requirementProcessors: SecurityRequirementProcessor[][],
) {
  let desiredError: Error | undefined;
  for (const processorSet of requirementProcessors) {
    try {
      const setResult = await applyProcessors(ctx, processorSet);
      if (setResult === false) {
        continue;
      }

      for (const key of Object.keys(setResult)) {
        ctx.setRequestData(`openapi-security-${key}`, setResult[key]);
      }

      return;
    } catch (e: any) {
      if (isHttpError(e)) {
        // Remember the error, but keep trying other security methods.
        desiredError = e;
        continue;
      }

      throw e;
    }
  }

  if (requirementProcessors.length > 0) {
    throw (
      (requirementProcessors.length === 1 && desiredError) || new Unauthorized()
    );
  }

  return {};
}

async function applyProcessors(
  ctx: OperationRequestContext,
  set: SecurityRequirementProcessor[],
) {
  const results: Record<string, any> = {};
  for (const processor of set) {
    const result = await processor.process(ctx);
    if (result === false) {
      return false;
    }
    results[processor.schemeKey] = result;
  }

  return results;
}
