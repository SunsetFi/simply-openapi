import { Unauthorized, isHttpError } from "http-errors";

import { RequestContext } from "../../handler-middleware";
import { nameOperationFromContext } from "../../utils";

import { RequestProcessorFactoryContext } from "../RequestProcessorFactoryContext";
import { RequestProcessorFactory } from "../types";

import { ApiKeyRequirementProcessor } from "./ApiKeyRequirementProcessor";
import { HttpRequirementProcessor } from "./HttpRequirementProcessor";
import { SecurityRequirementProcessor } from "./SecurityRequirementProcessor";

export const securityRequestProcessorFactory: RequestProcessorFactory = (
  ctx,
) => {
  const processor = new SecurityRequestProcessor(ctx);
  return processor.process.bind(processor);
};

class SecurityRequestProcessor {
  private _securityRequirementProcessors: SecurityRequirementProcessor[][];

  constructor(ctx: RequestProcessorFactoryContext) {
    const schemes = ctx.securitySchemes;

    this._securityRequirementProcessors = ctx.securities.map((security) => {
      return Object.entries(security).map(([key, scopes]) => {
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
      });
    });
  }

  async process(ctx: RequestContext) {
    let desiredError: Error | undefined;
    for (const processorSet of this._securityRequirementProcessors) {
      try {
        const setResult = await this._processSet(processorSet, ctx);
        if (setResult === false) {
          continue;
        }
        return {
          security: setResult,
        };
      } catch (e: any) {
        if (isHttpError(e)) {
          // Remember the error, but keep trying other security methods.
          desiredError = e;
          continue;
        }

        throw e;
      }
    }

    if (this._securityRequirementProcessors.length > 0) {
      throw (
        (this._securityRequirementProcessors.length === 1 && desiredError) ||
        new Unauthorized()
      );
    }

    return {};
  }

  private async _processSet(
    set: SecurityRequirementProcessor[],
    ctx: RequestContext,
  ): Promise<false | Record<string, any>> {
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
}
