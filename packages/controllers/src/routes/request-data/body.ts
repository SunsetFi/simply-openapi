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
import { ValidationError } from "ajv";

const defaultRequestProcessor: RequestDataProcessor = (req) => ({
  body: req.body,
});

export const bodyRequestDataProcessorFactory: RequestDataProcessorFactory = (
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
    // Content is required in the spec, but allow none I suppose...
    requestBody.content ?? {},
    ({ schema }, key) => compileSchema(key, schema),
  );

  return (req: Request) => {
    // unfortunately, express (maybe body-parser?) gives us an empty object if no body.
    if (!req.body || Object.keys(req.body).length === 0) {
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
      if (Object.keys(requestBody.content ?? {}).length === 0) {
        // no content types defined, so we can't do anything.
        // Required was already taken care of, so just
        // return whatever we have.
        return {
          body: req.body,
        };
      }

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
