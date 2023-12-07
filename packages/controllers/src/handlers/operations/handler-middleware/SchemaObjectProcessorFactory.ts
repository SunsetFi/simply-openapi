import { SchemaObject } from "openapi3-ts/oas31";
import Ajv, { ValidateFunction, ValidationError } from "ajv";

import { sliceAjvError } from "../../../ajv";

import { ValueProcessorFunction } from "./types";

export class SchemaObjectProcessorFactory {
  constructor(private _ajv: Ajv) {}

  createValueProcessor(schema: SchemaObject): ValueProcessorFunction {
    // Wrap the value so that coersion functions properly on non-reference values.
    const wrappedSchema: SchemaObject = {
      type: "object",
      properties: {
        value: schema,
      },
      required: ["value"],
    };

    let validate: ValidateFunction;
    try {
      validate = this._ajv.compile(wrappedSchema);
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
}
