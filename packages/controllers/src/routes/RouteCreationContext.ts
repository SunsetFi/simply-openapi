import { OpenAPIObject } from "openapi3-ts/oas31";
import Ajv from "ajv";

import { RequestMethod } from "../types";
import { OperationContext } from "../handlers";

export class RouteCreationContext extends OperationContext {
  constructor(
    spec: OpenAPIObject,
    path: string,
    method: RequestMethod,
    private _ajv: Ajv,
  ) {
    super(spec, path, method);
  }

  get ajv(): Ajv {
    return this._ajv;
  }
}
