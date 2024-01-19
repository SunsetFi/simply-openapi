import { OpenAPIObject } from "openapi3-ts/oas31";
import AJV, { _, Options as AjvOptions, ErrorObject } from "ajv";
import addFormats from "ajv-formats";

const ajv = new AJV({ coerceTypes: true, useDefaults: true });
addFormats(ajv);

export default ajv;

export function createOpenAPIAjv(spec: OpenAPIObject, opts?: AjvOptions): AJV {
  const ajv = new AJV({
    schemaId: "$id",
    discriminator: true,
    ...opts,
  });

  addFormats(ajv);

  // Allow SchemaObject examples that do not participate in validation.
  ajv.addKeyword({
    keyword: "example",
    code(ctx) {
      ctx.fail(_`false`);
    },
  });

  // Add the spec for $ref resolution.
  ajv.addSchema(spec);

  return ajv;
}

export function sliceAjvError(errorObject: ErrorObject, propertyName: string) {
  // Clone the original error object to avoid mutating it
  let newError = { ...errorObject };

  // Check if the property name exists in the instancePath
  const propertyPath = "/" + propertyName;
  if (newError.instancePath.startsWith(propertyPath)) {
    // Modify the instancePath to point to the nested property
    newError.instancePath = newError.instancePath.substring(
      propertyPath.length,
    );

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

export function errorObjectsToMessage(errors: Partial<ErrorObject>[]): string {
  let message: string;

  const processedErrors = errors.map(partialErrorToError);

  if (!errors || errors.length === 0) {
    message = "No errors";
  } else {
    message = processedErrors
      .map((e) => `value${e.instancePath} ${e.message}`)
      .join(", ");
  }

  return message;
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
