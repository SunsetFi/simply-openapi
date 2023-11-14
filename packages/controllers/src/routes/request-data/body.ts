import { mapValues } from "lodash";
import { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";
import { Request } from "express";
import { BadRequest } from "http-errors";

import { pickContentType, resolveReference } from "../../schema-utils";

import {
  RequestDataProcessor,
  RequestDataProcessorFactory,
  ValueProcessorFunction,
} from "./types";
import { nameOperationFromRequestProcessorContext } from "./utils";

const defaultRequestProcessor: RequestDataProcessor = (req) => ({
  body: req.body,
});

export const bodyRequestDataExtractorFactory: RequestDataProcessorFactory = (
  ctx,
) => {
  if (!ctx.operation.requestBody) {
    return defaultRequestProcessor;
  }

  const requestBody = resolveReference(ctx.spec, ctx.operation.requestBody);
  if (!requestBody) {
    throw new Error(
      `Could not resolve requestBody reference for operation ${nameOperationFromRequestProcessorContext(
        ctx,
      )}.`,
    );
  }

  if (!requestBody.content) {
    // This is invalid according to the openapi spec, but handle it.
    return defaultRequestProcessor;
  }

  const compileSchema = (
    key: string,
    schema: SchemaObject | ReferenceObject | undefined,
  ) => {
    if (!schema) {
      return (value: any) => value;
    }

    const resolved = resolveReference(ctx.spec, schema);
    if (!resolved) {
      throw new Error(
        `Could not resolve requestBody schema reference for content type ${key} in operation ${nameOperationFromRequestProcessorContext(
          ctx,
        )}.`,
      );
    }

    return ctx.createValueProcessor(resolved);
  };

  const processors: Record<string, ValueProcessorFunction> = mapValues(
    requestBody.content,
    ({ schema }, key) => compileSchema(key, schema),
  );

  return (req: Request) => {
    // unfortunately, express (maybe body-parser?) gives us an empty object if no body.
    if (Object.keys(req.body).length === 0) {
      if (requestBody.required) {
        throw new BadRequest(`Request body is required.`);
      }

      return {
        body: undefined,
      };
    }

    const contentType = req.headers["content-type"] ?? "";

    const processor = pickContentType(contentType, processors);
    if (!processor) {
      if (contentType === "") {
        throw new BadRequest(`The Content-Type header is required.`);
      }

      throw new BadRequest(
        `Request body content type ${contentType} is not supported.  Supported content types: ${Object.keys(
          requestBody.content,
        ).join(", ")}`,
      );
    }

    try {
      return {
        body: processor(req.body),
      };
    } catch (err: any) {
      throw new BadRequest(`Invalid request body: ${err.message}`);
    }
  };
};
