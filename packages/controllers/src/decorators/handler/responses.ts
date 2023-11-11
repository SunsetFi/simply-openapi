import { ResponseObject, ContentObject, SchemaObject } from "openapi3-ts/oas31";
import { Response } from "express";

import { mergeSOCControllerMethodMetadata } from "../../metadata";

/**
 * Documents a possible response from this operation.
 * @param statusCode The status code of the response.
 * @param response The OpenAPI response object.
 * @param content A mapping of content types this response object can return.  This is optional and merged with response.
 */
export function Response(
  statusCode: number | "default",
  response: ResponseObject,
  content?: ContentObject
) {
  return function (target: any, propertyKey: string | symbol | undefined) {
    if (propertyKey === undefined) {
      throw new Error(`@Response() must be applied to a method.`);
    }

    // Warn: We might be a bound method.  In which case, operationFragment will be totally ignored.
    mergeSOCControllerMethodMetadata(
      target,
      {
        operationFragment: {
          responses: {
            [String(statusCode)]: {
              ...response,
              content: {
                ...(response.content ?? {}),
                ...(content ?? {}),
              },
            },
          },
        },
      },
      propertyKey
    );
  };
}

/**
 * Documents an application/json response from this operation.
 * @param statusCode The status code of the response.
 * @param response The OpenAPI response object.
 * @param schema The OpenAPI schema object for the application/json response.
 */
export function JsonResponse(
  statusCode: number | "default",
  response: ResponseObject,
  schema: SchemaObject
) {
  return Response(statusCode, response, {
    "application/json": {
      schema,
    },
  });
}
