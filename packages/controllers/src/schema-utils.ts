import Ptr from "@json-schema-spec/json-pointer";
import { OpenAPIObject, ReferenceObject } from "openapi3-ts/oas31";

/**
 * Pick a value from the record based on the matched content type.
 * @param contentType The content type to match
 * @param values A record where keys are media type patterns and values are the values to pick.
 * @returns The picked value, or null if no value matched.
 */
export function pickContentType<T>(
  contentType: string | null,
  values: Record<string, T>,
): T | null {
  if (contentType === "") {
    contentType = null;
  }

  if (contentType) {
    const semicolon = contentType.indexOf(";");
    if (semicolon !== -1) {
      contentType = contentType.substring(0, semicolon);
    }
  }

  if (!contentType) {
    return values["*/*"] ?? null;
  }

  const contentTypeParts = contentType.split("/");
  let chosen: T | null = null;
  let wildcardsUsed = 0;
  for (const [type, value] of Object.entries(values)) {
    const typeParts = type.split("/");
    if (typeParts[0] !== "*" && typeParts[0] !== contentTypeParts[0]) {
      continue;
    }

    if (typeParts[1] !== "*" && typeParts[1] !== contentTypeParts[1]) {
      continue;
    }

    let localWildcards =
      (typeParts[0] === "*" ? 1 : 0) + (typeParts[1] === "*" ? 1 : 0);
    if (!chosen || localWildcards < wildcardsUsed) {
      wildcardsUsed = localWildcards;
      chosen = value;
      if (localWildcards === 0) {
        break;
      }
    }
  }

  return chosen;
}

/**
 * Resolve value that may be a reference to the actual value.
 * @param spec The OpenAPI spec root object.
 * @param value The referencable value.
 * @returns The resolved value or null if the reference could not be resolved.
 */
export function resolveReference<T extends object>(
  spec: OpenAPIObject,
  value: T | ReferenceObject,
): T | null {
  if ("$ref" in value) {
    if (!value["$ref"].startsWith("#")) {
      throw new Error(
        `Cannot resolve external reference "${value["$ref"]}" in the OpenAPI schema.`,
      );
    }
    const ptr = Ptr.parse(value["$ref"].substring(1));
    try {
      return ptr.eval(spec);
    } catch {
      return null;
    }
  }

  return value;
}
