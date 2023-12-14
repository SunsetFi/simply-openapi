import { OpenAPIObject } from "openapi3-ts/oas31";

import { RequestMethod } from "../types";
import { OperationContext } from "../handlers";
import { ValidatorFactories } from "../validation";

export class RouteCreationContext extends OperationContext {
  constructor(
    spec: OpenAPIObject,
    path: string,
    method: RequestMethod,
    private _validatorFactories: ValidatorFactories,
  ) {
    super(spec, path, method);
  }

  get validators(): ValidatorFactories {
    return this._validatorFactories;
  }
}
