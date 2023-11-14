import {
  BaseParameterObject,
  ReferenceObject,
  SchemaObject,
  SchemaObjectType,
} from "openapi3-ts/oas31";

import { createParameterDecorator } from "./utils";

/**
 * Defines a header parameter in the OpenAPI spec and registers it to pass to this method argument.
 * @param name The name of the parameter.
 * @param schema The schema of the parameter.
 * @param spec The specification of the OpenAPI parameter.
 */
export function Header(
  name: string,
  schema: SchemaObject | ReferenceObject | SchemaObjectType | null,
  spec?: BaseParameterObject,
): ParameterDecorator {
  let finalParam: BaseParameterObject = {
    ...spec,
  };
  if (typeof schema === "string") {
    finalParam.schema = { type: schema };
  } else if (schema !== null) {
    finalParam.schema = schema;
  }

  return createParameterDecorator(name, "header", finalParam);
}

/**
 * Defines a required header parameter in the OpenAPI spec and registers it to pass to this method argument.
 * @param name The name of the parameter.
 * @param schema The schema of the parameter.
 * @param spec The specification of the OpenAPI parameter.
 */
export function RequiredHeader(
  name: string,
  schema: SchemaObject | ReferenceObject | SchemaObjectType | null,
  spec?: BaseParameterObject,
): ParameterDecorator {
  return Header(name, schema, {
    ...spec,
    required: true,
  });
}
