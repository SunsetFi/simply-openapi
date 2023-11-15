import { Request } from "express";
import { ParameterObject } from "openapi3-ts/oas31";
import { NotFound, BadRequest } from "http-errors";

import { resolveReference } from "../../schema-utils";

import { ExtractedRequestData } from "../../types";

import { RequestDataProcessorFactory, ValueProcessorFunction } from "./types";
import { nameOperationFromRequestProcessorContext } from "./utils";

export const parametersRequestDataExtractorFactory: RequestDataProcessorFactory =
  (ctx) => {
    // Find the parameter object in the OpenAPI operation
    const resolvedParams = [
      ...(ctx.operation.parameters ?? []),
      ...(ctx.pathItem.parameters ?? []),
    ].map((param) => {
      const resolved = resolveReference(ctx.spec, param);
      if (!resolved) {
        throw new Error(
          `Could not resolve parameter reference for parameter in operation ${nameOperationFromRequestProcessorContext(
            ctx,
          )}.`,
        );
      }

      return resolved;
    });

    const compileSchema = (param: ParameterObject) => {
      if (!param.schema) {
        return (value: any) => value;
      }

      const resolved = resolveReference(ctx.spec, param.schema);
      if (!resolved) {
        throw new Error(
          `Could not resolve parameter schema reference for parameter ${
            param.name
          } in operation ${nameOperationFromRequestProcessorContext(ctx)}.`,
        );
      }

      return ctx.createValueProcessor(resolved);
    };

    const processors = resolvedParams.reduce(
      (acc, param) => {
        const processor = compileSchema(param);
        return {
          ...acc,
          [param.name]: processor,
        };
      },
      {} as Record<string, ValueProcessorFunction>,
    );

    return (req: Request) => {
      const getValue = (param: ParameterObject) => {
        switch (param.in) {
          case "path":
            return req.params[param.name];
          case "query":
            return req.query[param.name];
          case "cookie":
            return req.cookies[param.name];
          case "header":
            return req.headers[param.name];
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
          // TODO: Better error messages, say the name of the subject and if its a query/cookie/header
          throw new BadRequest(`Parameter ${param.name} is required.`);
        }
      };

      const result: Partial<ExtractedRequestData> = {
        parameters: {},
      };

      for (const param of resolvedParams) {
        const processor = processors[param.name];

        const rawValue = getValue(param);
        if (rawValue === undefined) {
          checkRequired(param);
          continue;
        }

        let value: any;
        try {
          value = processor(rawValue);
        } catch (e: any) {
          if (param.in === "path") {
            throw new NotFound();
          }

          throw new BadRequest(
            `Parameter ${param.name} is invalid: ${e.message}`,
          );
        }

        result.parameters![param.name] = value;
      }

      return result;
    };
  };
