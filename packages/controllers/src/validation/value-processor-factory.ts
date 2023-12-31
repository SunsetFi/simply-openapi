import { SchemaObject } from "openapi3-ts/oas31";
import Ajv, { ValidateFunction, ValidationError } from "ajv";

import { sliceAjvError } from "./ajv";
import { ValueValidatorFunction } from "./types";

export function createValueValidator(
  ajv: Ajv,
  schema: SchemaObject,
): ValueValidatorFunction {
  // Wrap the value so that coercion functions properly on non-reference values.
  const wrappedSchema: SchemaObject = {
    type: "object",
    properties: {
      value: schema,
    },
    required: ["value"],
  };

  let validate: ValidateFunction;
  try {
    validate = ajv.compile(wrappedSchema);
  } catch (e: any) {
    throw e;
  }
  return (value: any) => {
    const wrapper = { value };
    if (!validate(wrapper)) {
      throw new ValidationError(
        validate.errors!.map((error) => sliceAjvError(error, "value")),
      );
    }

    return wrapper.value;
  };
}
