import AJV, {
  _,
  Options as AjvOptions,
  ErrorObject,
  ValidationError,
} from "ajv";
import addFormats from "ajv-formats";

const ajv = new AJV({ coerceTypes: true, useDefaults: true });
addFormats(ajv);

export default ajv;

export function createOpenAPIAjv(opts?: AjvOptions): AJV {
  const ajv = new AJV({
    schemaId: "$id",
    coerceTypes: true,
    useDefaults: true,
    discriminator: true,
    ...opts,
  });

  addFormats(ajv);

  // Allow SchemaObject examples that do not participate in validation.
  // Note: Oddly enough, ajv allows examples plural but not example.
  ajv.addKeyword({
    keyword: "example",
    code(ctx) {
      ctx.fail(_`false`);
    },
  });

  return ajv;
}

export function errorToMessage(error: ValidationError): string {
  return ajv.errorsText(error.errors.map(partialErrorToError), {
    dataVar: "value",
  });
}

function partialErrorToError(error: Partial<ErrorObject>): ErrorObject {
  return {
    keyword: "",
    instancePath: "",
    schemaPath: "#/",
    params: {},
    message: "validation failed",
    ...error,
  };
}
