import Ajv, { ErrorObject } from "ajv";

export class ValidationError extends Error {
  constructor(
    public readonly errors: ErrorObject[],
    public readonly ajv: Ajv,
  ) {
    super(ajv.errorsText(errors));
  }
}
