import { mapValues } from "lodash";
import {
  ReferenceObject,
  RequestBodyObject,
  SchemaObject,
} from "openapi3-ts/oas31";
import { BadRequest } from "http-errors";
import { ValidationError } from "ajv";

import { pickContentType, resolveReference } from "../../../schema-utils";
import {
  ValueValidatorFunction,
  errorObjectsToMessage,
} from "../../../validation";

import { OperationRequestContext } from "../../OperationRequestContext";

import { nameOperationFromContext } from "../utils";

import {
  OperationMiddlewareFunction,
  OperationMiddlewareFactory,
  OperationMiddlewareNextFunction,
} from "./types";
import { OperationMiddlewareFactoryContext } from "./OperationMiddlewareFactoryContext";

const defaultBodyHandlerMiddleware: OperationMiddlewareFunction = (
  ctx,
  next,
) => {
  ctx.setRequestData("openapi-body", ctx.req.body);
  return next();
};

export const bodyProcessorMiddlewareFactory: OperationMiddlewareFactory = (
  ctx,
) => {
  const requestBody = ctx.requestBody;

  if (!requestBody) {
    return defaultBodyHandlerMiddleware;
  }

  const processors: Record<string, ValueValidatorFunction> = mapValues(
    // Content is required in the spec, but allow none I suppose...
    requestBody.content ?? {},
    ({ schema }, key) => compileContentSchema(key, schema, ctx),
  );

  return (
    reqCtx: OperationRequestContext,
    next: OperationMiddlewareNextFunction,
  ) => {
    const body = extractBody(reqCtx, requestBody, processors);
    reqCtx.setRequestData("openapi-body", body);
    return next();
  };
};

function compileContentSchema(
  key: string,
  schema: SchemaObject | ReferenceObject | undefined,
  ctx: OperationMiddlewareFactoryContext,
) {
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
    return ctx.validators.createCoercingValidator(resolved);
  } catch (e: any) {
    e.message = `Failed to compile schema for body ${key}: ${e.message}`;
    throw e;
  }
}

function extractBody(
  ctx: OperationRequestContext,
  requestBody: RequestBodyObject,
  processors: Record<string, ValueValidatorFunction>,
) {
  // unfortunately, express (maybe body-parser?) gives us an empty object if no body.
  if (!ctx.req.body || Object.keys(ctx.req.body).length === 0) {
    if (requestBody.required) {
      throw new BadRequest(`Request body is required.`);
    }

    return undefined;
  }

  if (Object.keys(requestBody.content ?? {}).length === 0) {
    // no content types defined, so we can't do anything.
    // Required was already taken care of, so just
    // return whatever we have.
    return ctx.req.body;
  }

  const contentType = ctx.req.headers["content-type"] ?? "";

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
    return processor(ctx.req.body);
  } catch (err: any) {
    if (err instanceof ValidationError) {
      let addend = "";
      if (err.errors) {
        addend = `: ${errorObjectsToMessage(err.errors)}`;
      }

      throw new BadRequest(`Invalid request body${addend}`);
    }
    throw err;
  }
}
