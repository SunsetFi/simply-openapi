import { InternalServerError } from "http-errors";

import { pickContentType, resolveReference } from "../../../schema-utils";
import { isPlainJson } from "../../../utils";

import { RequestContext } from "../../RequestContext";

import { nameOperationFromContext } from "../utils";

import { HandlerResult } from "./handler-result";
import { OperationMiddlewareFactoryContext } from "./OperationMiddlewareFactoryContext";
import {
  OperationHandlerMiddlewareFactory,
  OperationHandlerMiddlewareNextFunction,
  ValueProcessorFunction,
} from "./types";
import { ValidationError } from "ajv";
import { errorToMessage } from "../../../ajv";

// Function to prepare response schemas
function prepareResponseSchemas(ctx: OperationMiddlewareFactoryContext) {
  const responseSchemas: Record<
    string,
    Record<string, ValueProcessorFunction>
  > = {};
  function processContent(content: Record<string, any>) {
    const valueProcessors: Record<string, ValueProcessorFunction> = {};

    Object.entries(content).forEach(([contentType, { schema }]) => {
      const resolvedSchema = resolveReference(ctx.spec, schema);
      if (resolvedSchema) {
        valueProcessors[contentType] = ctx.compileSchema(resolvedSchema);
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
  errorHandler: ((error: Error) => void) | null,
  reqCtx: RequestContext,
  next: OperationHandlerMiddlewareNextFunction,
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
      errorHandler(error);
      // Return the result as-is, if the error handler didn't throw.
      return result;
    } else if (error instanceof ValidationError) {
      throw new InternalServerError(
        `The server returned an invalid response according to the OpenAPI schema: ${errorToMessage(
          error,
        )}`,
      );
    }

    throw error;
  }
}

// Middleware factory for response validation
export function responseValidationMiddlewareCreator(
  required: boolean,
  errorHandler: ((error: Error) => void) | null,
): OperationHandlerMiddlewareFactory {
  return (ctx) => {
    const responseSchemas = prepareResponseSchemas(ctx);
    return (
      reqCtx: RequestContext,
      next: OperationHandlerMiddlewareNextFunction,
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
