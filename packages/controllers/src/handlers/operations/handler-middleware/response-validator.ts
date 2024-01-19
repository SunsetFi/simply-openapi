import { InternalServerError } from "http-errors";
import { ValidationError } from "ajv";

import { pickContentType, resolveReference } from "../../../schema-utils";
import { isPlainJson } from "../../../utils";
import { ValueValidatorFunction } from "../../../validation";
import { errorObjectsToMessage } from "../../../validation/ajv";

import { OperationRequestContext } from "../../OperationRequestContext";

import { nameOperationFromContext } from "../utils";

import { HandlerResult } from "./handler-result";
import { OperationMiddlewareFactoryContext } from "./OperationMiddlewareFactoryContext";
import {
  OperationMiddlewareFactory,
  OperationMiddlewareNextFunction,
} from "./types";

// Function to prepare response schemas
function prepareResponseSchemas(ctx: OperationMiddlewareFactoryContext) {
  const responseSchemas: Record<
    string,
    Record<string, ValueValidatorFunction>
  > = {};
  function processContent(content: Record<string, any>) {
    const valueProcessors: Record<string, ValueValidatorFunction> = {};

    Object.entries(content).forEach(([contentType, { schema }]) => {
      const resolvedSchema = resolveReference(ctx.spec, schema);
      if (resolvedSchema) {
        valueProcessors[contentType] =
          ctx.validators.createResponseValidator(resolvedSchema);
      }
    });

    return valueProcessors;
  }

  Object.entries(ctx.operation.responses).forEach(([statusCode, response]) => {
    if (statusCode !== "default" && !/^[1-5]\d\d$/.test(statusCode)) {
      throw new Error(
        `Invalid status code "${statusCode}" in operation "${ctx.operation.operationId}".`,
      );
    }

    responseSchemas[statusCode] = processContent(response.content || {});
  });

  return responseSchemas;
}

// Middleware function for response validation
async function responseValidationMiddleware(
  responseSchemas: Record<number, Record<string, any>>,
  strict: boolean,
  errorHandler: ((error: Error, ctx: OperationRequestContext) => void) | null,
  reqCtx: OperationRequestContext,
  next: OperationMiddlewareNextFunction,
) {
  const result = await next();

  let status, contentType, body;
  if (result instanceof HandlerResult) {
    status = result._status;
    contentType = result._headers["Content-Type"];
    body = result._bodyJson || result._bodyRaw;
  } else if (isPlainJson(result)) {
    status = 200;
    contentType = "application/json";
    body = result;
  } else {
    return result;
  }

  // Validate the response
  try {
    const responseSchema = responseSchemas[status];
    if (!responseSchema) {
      if (strict) {
        throw new InternalServerError(
          `The operation ${nameOperationFromContext(
            reqCtx,
          )} did not define a response for status code ${status}.`,
        );
      }

      return result;
    }

    const validator = pickContentType(contentType, responseSchema);
    if (!validator) {
      if (strict) {
        throw new InternalServerError(
          `The operation ${nameOperationFromContext(
            reqCtx,
          )} did not define a response for status code ${status} content type ${contentType}.`,
        );
      }

      return result;
    }

    body = validator(body);
    if (result instanceof HandlerResult) {
      result._bodyJson = body;
      return result;
    } else {
      return body;
    }
  } catch (error: any) {
    // Handle validation error
    if (typeof errorHandler === "function") {
      errorHandler(error, reqCtx);
      // Return the result as-is, if the error handler didn't throw.
      return result;
    } else if (error instanceof ValidationError) {
      let addend = "";
      if (error.errors) {
        addend = `: ${errorObjectsToMessage(error.errors)}`;
      }

      throw new InternalServerError(
        `The server returned an invalid response according to the OpenAPI schema${addend}`,
      );
    }

    throw error;
  }
}

// Middleware factory for response validation
export function responseValidationMiddlewareCreator(
  required: boolean,
  errorHandler: ((error: Error, ctx: OperationRequestContext) => void) | null,
): OperationMiddlewareFactory {
  return (ctx) => {
    const responseSchemas = prepareResponseSchemas(ctx);
    return (
      reqCtx: OperationRequestContext,
      next: OperationMiddlewareNextFunction,
    ) =>
      responseValidationMiddleware(
        responseSchemas,
        required,
        errorHandler,
        reqCtx,
        next,
      );
  };
}
