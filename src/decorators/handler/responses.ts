import { ResponseObject } from "openapi3-ts/dist/oas30";
import { ContentObject, SchemaObject } from "openapi3-ts/oas31";
import { mergeSECControllerMethodMetadata } from "../../metadata";
import { Response } from "express";

/**
 * Documents a possible response from this operation.
 * @param statusCode The status code of the response.
 * @param response The OpenAPI response object.
 * @param content A mapping of content types this response object can return.  This is optional and merged with response.
 */
export function Response(
  statusCode: number,
  response: ResponseObject,
  content?: ContentObject
) {
  return function (target: any, propertyKey: string) {
    // Warn: We might be a bound method.  In which case, operationFragment will be totally ignored.
    mergeSECControllerMethodMetadata(
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
  statusCode: number,
  response: ResponseObject,
  schema: SchemaObject
) {
  return Response(statusCode, response, {
    "application/json": {
      schema,
    },
  });
}
