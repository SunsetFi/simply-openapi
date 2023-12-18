import { SchemaObject } from "openapi3-ts/oas31";

/**
 * A function that validates and coerces a value.
 * For invalid values, this should throw a ValidationError
 */
export type ValueValidatorFunction = (value: any) => any;

export type ValueValidatorFactory = (
  schema: SchemaObject,
) => ValueValidatorFunction;

export type ValidatorExtension = string;
export interface ValidatorFactoriesCommon {
  /**
   * Creates a validator that strictly validates against the schema.
   * No data coercion is performed; the types must match exactly.
   * Default values provided by the schema will be applied to the resulting object.
   * @param schema The schema to create a validator for.
   */
  createStrictValidator(schema: SchemaObject): ValueValidatorFunction;

  /**
   * Creates a validator that can coerce incoming data to match the type.
   * Default values provided by the schema will be applied to the resulting object.
   * @param schema The schema to create a validator for.
   */
  createCoercingValidator(schema: SchemaObject): ValueValidatorFunction;
}

export type ValidatorFactories = ValidatorFactoriesCommon & {
  [key: ValidatorExtension]: ValueValidatorFactory;
};
