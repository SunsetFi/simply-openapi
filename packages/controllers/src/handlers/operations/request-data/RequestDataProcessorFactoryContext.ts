import { OpenAPIObject, SchemaObject } from "openapi3-ts/oas31";
import Ajv from "ajv";

import { RequestMethod } from "../../../types";

import { MethodHandlerContext } from "../../MethodHandlerContext";

import { OperationHandlerArgumentDefinitions } from "../types";

import { ValueProcessorFunction } from "./types";
import { SchemaObjectProcessorFactory } from "./SchemaObjectProcessorFactory";

export class RequestDataProcessorFactoryContext extends MethodHandlerContext {
  static fromMethodHandlerContext(context: MethodHandlerContext, ajv: Ajv) {
    return new RequestDataProcessorFactoryContext(
      context.spec,
      context.path,
      context.method,
      context.controller,
      context.handler,
      context.handlerArgs,
      ajv,
    );
  }

  private _schemaObjectProcessorFactory: SchemaObjectProcessorFactory;

  constructor(
    spec: OpenAPIObject,
    path: string,
    method: RequestMethod,
    controller: object,
    handler: Function,
    handlerArgs: OperationHandlerArgumentDefinitions,
    ajv: Ajv,
  ) {
    super(spec, path, method, controller, handler, handlerArgs);
    this._schemaObjectProcessorFactory = new SchemaObjectProcessorFactory(ajv);
  }

  /**
   * Create a value processor function with the given schema.
   * The returned function will validate the value against the schema, and may coerce it depending on user settings.
   * @param schema The schema to produce a validator for.
   */
  compileSchema(schema: SchemaObject): ValueProcessorFunction {
    return this._schemaObjectProcessorFactory.createValueProcessor(schema);
  }
}
