import {
  SchemaObject,
  RequestBodyObject,
  MediaTypeObject,
  ContentObject,
} from "openapi3-ts/oas31";

import { mergeSECControllerMethodMetadata } from "../../../metadata";

import { setMethodParameterType } from "./utils";

/**
 * Defines a path parameter in the OpenAPI spec and registers it to pass to this method argument.
 * @param name The name of the parameter.
 * @param spec The specification of the OpenAPI parameter.
 */
export function Body(spec?: RequestBodyObject): ParameterDecorator;
export function Body(
  spec: Omit<RequestBodyObject, "content">,
  mediaType: string,
  schema: SchemaObject,
  opts?: Omit<MediaTypeObject, "schema">
): ParameterDecorator;
export function Body(
  spec?: Partial<RequestBodyObject>,
  mediaType?: string,
  schema?: SchemaObject,
  opts?: Omit<MediaTypeObject, "schema">
): ParameterDecorator {
  return (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex: number
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
    mergeSECControllerMethodMetadata(
      target,
      {
        operationFragment: {
          requestBody: {
            ...spec,
            content: {
              ...content,
              ...spec?.content,
            },
          },
        },
      },
      propertyKey
    );
    setMethodParameterType(target, propertyKey, parameterIndex, {
      type: "http-body",
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
  opts?: Omit<MediaTypeObject, "schema">
) {
  return Body({ description }, "application/json", schema, opts);
}

/**
 * Defines a parameter that requires a body following the given schema.
 * @param description
 * @param schema
 * @param opts
 */
export function RequireJsonBody(
  description: string,
  schema: SchemaObject,
  opts?: Omit<MediaTypeObject, "schema">
) {
  return Body(
    { description, required: true },
    "application/json",
    schema,
    opts
  );
}
