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

export function sliceAjvError(errorObject: ErrorObject, propertyName: string) {
  // Clone the original error object to avoid mutating it
  let newError = { ...errorObject };

  // Check if the property name exists in the instancePath
  const propertyPath = "/" + propertyName;
  if (newError.instancePath.endsWith(propertyPath)) {
    // Modify the instancePath to point to the nested property
    newError.instancePath = newError.instancePath.replace(propertyPath, "");

    // If the data is an object and has the property, set it as the root value
    if (
      typeof newError.data === "object" &&
      newError.data !== null &&
      propertyName in newError.data
    ) {
      newError.data = (newError.data as any)[propertyName];
    }
  }

  return newError;
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
