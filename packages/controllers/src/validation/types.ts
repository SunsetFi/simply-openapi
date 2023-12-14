import { SchemaObject } from "openapi3-ts/oas31";

/**
 * A function that validates and coerces a value.
 * For invalid values, this should throw a ValidationError
 */
export type ValueValidatorFunction = (value: any) => any;

export type ValueValidatorFactory = (
  schema: SchemaObject,
) => ValueValidatorFunction;

export type ValidatorExtension = `x-${string}`;
export interface ValidatorFactoriesCommon {
  /**
   * Creates a validator that strictly validates against the schema.
   * No coersion is performed.
   * @param schema The schema to create a validator for.
   */
  createStrictValidator(schema: SchemaObject): ValueValidatorFunction;

  /**
   * Creates a validator that can coerce incoming data to match the type.
   * @param schema The schema to create a validator for.
   */
  createCoersionValidator(schema: SchemaObject): ValueValidatorFunction;
}

export type ValidatorFactories = ValidatorFactoriesCommon & {
  [key: ValidatorExtension]: ValueValidatorFactory;
};
