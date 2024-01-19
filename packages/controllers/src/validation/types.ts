import { SchemaObject } from "openapi3-ts/oas31";
import Ajv, { Options as AjvOptions } from "ajv";

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
   * Creates a validator that validates incoming parameter data.
   * Data coercion is performed; the types do not need to match exactly.
   * Default values provided by the schema will be applied to the resulting object.
   * @param schema The schema to create a validator for.
   */
  createParameterValidator(schema: SchemaObject): ValueValidatorFunction;

  /**
   * Creates a validator that validates incoming request bodies.
   * Data coercion is performed; the types do not need to match exactly.
   * Default values provided by the schema will be applied to the resulting object.
   * @param schema The schema to create a validator for.
   */
  createBodyValidator(schema: SchemaObject): ValueValidatorFunction;

  /**
   * Creates a validator that validates response bodies against the response schema.
   * No data coercion is performed; the types must match exactly.
   * Default values provided by the schema will be applied to the resulting object.
   * @param schema The schema to create a validator for.
   */
  createResponseValidator(schema: SchemaObject): ValueValidatorFunction;
}

export type ValidatorFactories = ValidatorFactoriesCommon & {
  [key: ValidatorExtension]: ValueValidatorFactory;
};

export type ValidatorFactoryOption = ValueValidatorFunction | Ajv | AjvOptions;
