import { SchemaObject } from "openapi3-ts/oas31";
import { omit } from "lodash";

export function omitProperties(
  schema: SchemaObject,
  ...properties: string[]
): SchemaObject {
  return {
    ...schema,
    properties: omit(schema.properties, properties),
    required: schema.required?.filter(
      (requiredProperty) => !properties.includes(requiredProperty)
    ),
  };
}

export function arrayOf(schema: SchemaObject): SchemaObject {
  return {
    type: "array",
    items: schema,
  };
}

export const nonEmptyStringSchema: SchemaObject = {
  type: "string",
  minLength: 1,
};

export const numberGTEZeroSchema: SchemaObject = {
  type: "number",
  minimum: 0,
};
