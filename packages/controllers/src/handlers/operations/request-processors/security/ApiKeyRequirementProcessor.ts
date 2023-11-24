import { SecuritySchemeObject } from "openapi3-ts/oas31";

import { RequestContext } from "../../handler-middleware";

import { SecurityRequirementProcessor } from "./SecurityRequirementProcessor";

export class ApiKeyRequirementProcessor extends SecurityRequirementProcessor {
  constructor(
    schemeKey: string,
    scheme: SecuritySchemeObject,
    scopes: string[],
  ) {
    if (scheme.type !== "apiKey") {
      throw new Error("Invalid security scheme type.");
    }

    if (!scheme.name) {
      throw new Error("API key security scheme does not have a name.");
    }

    if (!scheme.in) {
      throw new Error("API key security scheme does not have a location.");
    }

    if (!["header", "query", "cookie"].includes(scheme.in)) {
      throw new Error(
        `Unknown API key security scheme location "${scheme.in}".`,
      );
    }

    super(schemeKey, scheme, scopes);
  }

  protected _getValue(ctx: RequestContext) {
    let value: any;
    switch (this.scheme.in) {
      case "header":
        value = ctx.getHeader(this.scheme.name!);
        break;
      case "query":
        value = ctx.getQuery(this.scheme.name!);
        break;
      case "cookie":
        value = ctx.getCookie(this.scheme.name!);
        break;
    }

    return value;
  }
}
