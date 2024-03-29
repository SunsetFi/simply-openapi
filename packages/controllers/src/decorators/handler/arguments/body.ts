import {
  SchemaObject,
  RequestBodyObject,
  MediaTypeObject,
  ContentObject,
} from "openapi3-ts/oas31";

import { mergeSOCControllerMethodMetadata } from "../../../metadata";

import { setMethodParameterType } from "./utils";

/**
 * Defines a path parameter in the OpenAPI spec and registers it to pass to this method argument.
 * @param name The name of the parameter.
 * @param spec The specification of the OpenAPI parameter.
 */
export function Body(
  mediaType: string,
  schema: SchemaObject,
  request?: Partial<RequestBodyObject>,
  opts?: Omit<MediaTypeObject, "schema">,
) {
  return (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex?: number,
  ) => {
    if (propertyKey === undefined) {
      throw new Error("Body parameter must be on a method or method argument.");
    }

    let content: ContentObject = {};
    if (mediaType) {
      content[mediaType] = {
        schema: schema,
        ...opts,
      };
    }

    // Warn: We might be a bound method.  In which case, operationFragment will be totally ignored.
    mergeSOCControllerMethodMetadata(
      target,
      {
        operationFragment: {
          requestBody: {
            ...request,
            content: {
              ...request?.content,
              [mediaType]: {
                ...request?.content?.[mediaType],
                schema,
                ...opts,
              },
            },
          },
        },
      },
      propertyKey,
    );

    if (parameterIndex != undefined) {
      setMethodParameterType(target, propertyKey, parameterIndex, {
        type: "openapi-requestbody",
        mediaType,
      });
    }
  };
}

/**
 * Defines a parameter that accepts an optional json object in the body.
 * @param schema The schema of the json object.
 * @param request Additional information on the request.
 * @param opts Additional information on the content type.
 */
export function OptionalJsonBody(
  schema: SchemaObject,
  request?: Omit<RequestBodyObject, "content">,
  opts?: Omit<MediaTypeObject, "schema">,
) {
  return Body(
    "application/json",
    schema,
    {
      required: false,
      ...request,
    },
    opts,
  );
}

/**
 * Defines a parameter that requires a body following the given schema.
 * @param schema The schema of the json object.
 * @param request Additional information on the request.
 * @param opts Additional information on the content type.
 */
export function RequiredJsonBody(
  schema: SchemaObject,
  request?: Omit<RequestBodyObject, "content">,
  opts?: Omit<MediaTypeObject, "schema">,
) {
  return Body(
    "application/json",
    schema,
    {
      required: true,
      ...request,
    },
    opts,
  );
}

/**
 * Binds the argument to the request body.
 */
export function BindBody() {
  return (
    target: any,
    propertyKey: string | symbol,
    parameterIndex: number,
  ) => {
    setMethodParameterType(target, propertyKey, parameterIndex, {
      type: "openapi-requestbody",
      mediaType: "*/*",
    });
  };
}
