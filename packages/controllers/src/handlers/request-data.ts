export type SecurityRequestDataKey = `openapi-security-${string}`;
export function isSecurityRequestDataKey(
  name: string,
): name is SecurityRequestDataKey {
  return name.startsWith("openapi-security-");
}

export type ParameterRequestDataKey = `openapi-parameter-${string}`;
export function isParameterRequestDataKey(
  name: string,
): name is ParameterRequestDataKey {
  return name.startsWith("openapi-parameter-");
}

export type BodyRequestDataKey = "openapi-body";
export function isBodyRequestDataKey(name: string): name is BodyRequestDataKey {
  return name === "openapi-body";
}

export type ExtensionRequestDataKey = `x-${string}`;
export function isExtensionRequestDataKey(
  name: string,
): name is ExtensionRequestDataKey {
  return name.startsWith("x-");
}

export type RequestDataKey =
  | SecurityRequestDataKey
  | ParameterRequestDataKey
  | BodyRequestDataKey
  | ExtensionRequestDataKey;
