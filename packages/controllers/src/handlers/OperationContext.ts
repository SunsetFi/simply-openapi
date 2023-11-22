import {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  PathItemObject,
  RequestBodyObject,
} from "openapi3-ts/oas31";
import { RequestMethod } from "../types";
import { resolveReference } from "../schema-utils";

export class OperationContext {
  private _pathItem: PathItemObject;
  private _operation: OperationObject;

  constructor(
    private readonly _spec: OpenAPIObject,
    private readonly _path: string,
    private readonly _method: RequestMethod,
  ) {
    const pathItem = this._spec.paths?.[this._path];
    if (!pathItem) {
      throw new Error(`Could not find path item for path ${this._path}.`);
    }

    this._pathItem = pathItem;

    const operation = this._pathItem[this._method];
    if (!operation) {
      throw new Error(
        `Could not find operation ${this._method} for path ${this._path}.`,
      );
    }

    this._operation = operation;
  }

  /**
   * The OpenAPI specification object.
   */
  get spec(): OpenAPIObject {
    return this._spec;
  }

  /**
   * The full path of this operation.
   */
  get path(): string {
    return this._path;
  }

  /**
   * The HTTP method of this operation.
   */
  get method(): RequestMethod {
    return this._method;
  }

  /**
   * The OpenAPI path item object.
   */
  get pathItem(): PathItemObject {
    return this._pathItem;
  }

  /**
   * The OpenAPI operation object.
   */
  get operation(): OperationObject {
    return this._operation;
  }

  private _parameters: ParameterObject[] | undefined;
  /**
   * The resolved parameters for this operation.
   */
  get parameters(): ParameterObject[] {
    if (!this._parameters) {
      this._parameters = [
        ...(this.operation.parameters ?? []),
        ...(this.pathItem.parameters ?? []),
      ].map((param) => {
        const resolved = resolveReference(this.spec, param);
        if (!resolved) {
          throw new Error(
            `Could not resolve parameter reference for parameter in operation ${this.method} ${this.path}.`,
          );
        }

        return resolved;
      });
    }

    return this._parameters;
  }

  private _requestBody: RequestBodyObject | undefined;
  get requestBody(): RequestBodyObject | null {
    const bodyOrRef = this.operation.requestBody;
    if (!bodyOrRef) {
      return null;
    }

    if (!this._requestBody) {
      const resolved = resolveReference(this.spec, bodyOrRef);
      if (!resolved) {
        throw new Error(
          `Could not resolve requestBody reference for operation ${this.method} ${this.path}.`,
        );
      }
      this._requestBody = resolved;
    }

    return this._requestBody;
  }
}
