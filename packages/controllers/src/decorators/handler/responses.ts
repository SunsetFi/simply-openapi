import { ResponseObject, ContentObject, SchemaObject } from "openapi3-ts/oas31";

import { mergeSOCControllerMethodMetadata } from "../../metadata";

/**
 * Documents a possible response from this operation.
 * @param statusCode The status code of the response.
 * @param content A mapping of content types this response object can return.  This is optional and merged with response.
 * @param response The OpenAPI response object.
 */
export function Response(
  statusCode: number | "default",
  content: ContentObject,
  response?: ResponseObject,
) {
  return function (target: any, propertyKey: string | symbol) {
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
                ...content,
                ...(response?.content ?? {}),
              },
            },
          },
        },
      },
      propertyKey,
    );
  };
}

/**
 * Documents an application/json that returns no response.
 * @param statusCode The status code of the response.
 * @param response The OpenAPI response object.
 */
export function EmptyResponse(
  statusCode: number | "default",
  response?: ResponseObject,
) {
  return Response(statusCode, {}, response);
}

/**
 * Documents an application/json response from this operation.
 * @param statusCode The status code of the response.
 * @param schema The OpenAPI schema object for the application/json response.
 * @param response The OpenAPI response object.
 */
export function JsonResponse(
  statusCode: number | "default",
  schema: SchemaObject,
  response?: ResponseObject,
) {
  return Response(
    statusCode,
    {
      "application/json": {
        schema,
      },
    },
    response,
  );
}
