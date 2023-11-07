import AJV from "ajv";
import addFormats from "ajv-formats";

const ajv = new AJV({ coerceTypes: true, useDefaults: true });
addFormats(ajv);

export default ajv;
