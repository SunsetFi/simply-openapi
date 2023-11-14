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
  opts?: Omit<MediaTypeObject, "schema">,
  request?: Partial<RequestBodyObject>,
): ParameterDecorator {
  return (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) => {
    if (propertyKey === undefined) {
      throw new Error("Body parameter must be on a method.");
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
    setMethodParameterType(target, propertyKey, parameterIndex, {
      type: "openapi-requestbody",
    });
  };
}

/**
 * Defines a parameter that accepts an optional json object in the body.
 * @param spec The spec of the body.
 * @param schema The schema of the json object.
 * @param opts Additional openapi options.
 */
export function OptionalJsonBody(
  description: string,
  schema: SchemaObject,
  opts?: Omit<MediaTypeObject, "schema">,
) {
  return Body("application/json", schema, opts, { description });
}

/**
 * Defines a parameter that requires a body following the given schema.
 * @param description
 * @param schema
 * @param opts
 */
export function RequiredJsonBody(
  description: string,
  schema: SchemaObject,
  opts?: Omit<MediaTypeObject, "schema">,
) {
  return Body("application/json", schema, opts, {
    description,
    required: true,
  });
}
