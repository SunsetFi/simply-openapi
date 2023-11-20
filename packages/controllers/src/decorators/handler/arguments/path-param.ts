import {
  BaseParameterObject,
  ReferenceObject,
  SchemaObject,
  SchemaObjectType,
} from "openapi3-ts/oas31";

import { createParameterDecorator } from "./utils";

/**
 * Defines a path parameter in the OpenAPI spec and registers it to pass to this method argument.
 * @param name The name of the parameter.
 * @param schema The schema of the parameter.
 * @param spec The specification of the OpenAPI parameter.
 */
export function PathParam(
  name: string,
  schema: SchemaObject | ReferenceObject | SchemaObjectType | null,
  spec?: BaseParameterObject,
): ParameterDecorator {
  let finalParam: BaseParameterObject = {
    // The spec says path params are always required, but I suppose we can let the user override this if they really want to.
    required: true,
    ...spec,
  };

  if (typeof schema === "string") {
    finalParam.schema = { type: schema };
  } else if (schema !== null) {
    finalParam.schema = schema;
  }

  return createParameterDecorator(name, "path", finalParam);
}
