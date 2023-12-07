import { Request } from "express";
import { ParameterObject } from "openapi3-ts/oas31";
import { NotFound, BadRequest } from "http-errors";
import { capitalize } from "lodash";
import { ValidationError } from "ajv";

import { resolveReference } from "../../../schema-utils";
import { errorToMessage } from "../../../ajv";

import { RequestContext } from "../../RequestContext";

import { RequestData } from "../types";
import { nameOperationFromContext } from "../utils";

import { RequestProcessorFactory, ValueProcessorFunctionOld } from "./types";

export const parametersRequestProcessorFactory: RequestProcessorFactory = (
  ctx,
) => {
  const parameters = ctx.parameters;

  const compileParamSchema = (param: ParameterObject) => {
    if (!param.schema) {
      return (value: any) => value;
    }

    const resolved = resolveReference(ctx.spec, param.schema);
    if (!resolved) {
      throw new Error(
        `Could not resolve parameter schema reference for parameter ${
          param.name
        } in operation ${nameOperationFromContext(ctx)}.`,
      );
    }

    try {
      return ctx.compileSchema(resolved);
    } catch (e: any) {
      e.message = `Failed to compile schema for parameter ${param.in} ${param.name}: ${e.message}`;
      throw e;
    }
  };

  const processors = parameters.reduce(
    (acc, param) => {
      const processor = compileParamSchema(param);
      acc[param.name] = processor;
      return acc;
    },
    {} as Record<string, ValueProcessorFunctionOld>,
  );

  return (reqCtx: RequestContext) => {
    const getValue = (param: ParameterObject) => {
      switch (param.in) {
        case "path":
          return reqCtx.getPathParam(param.name);
        case "query":
          return reqCtx.getQuery(param.name);
        case "cookie":
          return reqCtx.getCookie(param.name);
        case "header":
          return reqCtx.getHeader(param.name);
        default:
          throw new Error(`Unsupported parameter location: ${param.in}`);
      }
    };

    const checkRequired = (param: ParameterObject) => {
      if (!param.required && param.in !== "path") {
        return;
      }

      if (param.in === "path") {
        throw new NotFound();
      } else {
        throw new BadRequest(
          `${capitalize(param.in)} parameter "${param.name}" is required.`,
        );
      }
    };

    const result: Partial<RequestData> = {
      parameters: {},
    };

    for (const param of parameters) {
      const processor = processors[param.name];

      const rawValue = getValue(param);
      if (rawValue === undefined) {
        checkRequired(param);
        result.parameters![param.name] = undefined;
        continue;
      }

      let value: any;
      try {
        value = processor(rawValue);
      } catch (e: any) {
        if (e instanceof ValidationError) {
          if (param.in === "path") {
            throw new NotFound();
          }

          throw new BadRequest(
            `${capitalize(param.in)} parameter "${
              param.name
            }" is invalid: ${errorToMessage(e)}`,
          );
        }
      }

      result.parameters![param.name] = value;
    }

    return result;
  };
};
