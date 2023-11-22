import { mapValues } from "lodash";
import { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";
import { Request } from "express";
import { BadRequest } from "http-errors";
import { ValidationError } from "ajv";

import { pickContentType, resolveReference } from "../../../schema-utils";
import { errorToMessage } from "../../../ajv";

import {
  RequestDataProcessor,
  RequestDataProcessorFactory,
  ValueProcessorFunction,
} from "./types";
import { nameOperationFromContext } from "../utils";

const defaultRequestProcessor: RequestDataProcessor = (req) => ({
  body: req.body,
});

export const bodyRequestDataProcessorFactory: RequestDataProcessorFactory = (
  ctx,
) => {
  const requestBody = ctx.requestBody;

  if (!requestBody) {
    return defaultRequestProcessor;
  }

  const compileContentSchema = (
    key: string,
    schema: SchemaObject | ReferenceObject | undefined,
  ) => {
    if (!schema) {
      return (value: any) => value;
    }

    const resolved = resolveReference(ctx.spec, schema);
    if (!resolved) {
      throw new Error(
        `Could not resolve requestBody schema reference for content type ${key} in operation ${nameOperationFromContext(
          ctx,
        )}.`,
      );
    }

    try {
      return ctx.compileSchema(resolved);
    } catch (e: any) {
      e.message = `Failed to compile schema for body ${key}: ${e.message}`;
      throw e;
    }
  };

  const processors: Record<string, ValueProcessorFunction> = mapValues(
    // Content is required in the spec, but allow none I suppose...
    requestBody.content ?? {},
    ({ schema }, key) => compileContentSchema(key, schema),
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
      if (err instanceof ValidationError) {
        throw new BadRequest(`Invalid request body: ${errorToMessage(err)}`);
      }
      throw err;
    }
  };
};
