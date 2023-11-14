```ts
private _buildParameterCollector(
    arg: SOCControllerMethodHandlerParameterArg,
    op: OperationObject
  ): ArgumentCollector {
    // Find the parameter object in the OpenAPI operation
    const resolvedParams = (op.parameters ?? [])
      .map((param) => resolveReference(this._spec, param))
      .filter(isNotNull);

    const param: ParameterObject | undefined = resolvedParams.find(
      (param) => param.name === arg.parameterName
    ) as ParameterObject;

    if (!param) {
      throw new Error(
        `Parameter ${arg.parameterName} not found in operation parameters.  Either it was not defined or its $ref failed to resolve.`
      );
    }

    const checkRequired = (value: any) => {
      if (value === undefined) {
        if (param.in === "path") {
          throw new NotFound();
        } else if (param.required) {
          throw new BadRequest(
            `Query parameter ${arg.parameterName} is required.`
          );
        }
      }
    };

    let schema = param.schema;

    if (!schema) {
      return (req: Request, _res) => {
        const value =
          param.in === "path"
            ? req.params[arg.parameterName]
            : req.query[arg.parameterName];
        checkRequired(value);
        return value;
      };
    }

    if (isReferenceObject(schema)) {
      const ref = schema;
      schema = resolveReference(this._spec, schema)!;
      if (!schema) {
        throw new Error(
          `Could not resolve schema reference ${ref["$ref"]} of parameter ${param.name}.`
        );
      }
    }

    const validationSchema = {
      type: "object",
      properties: { value: schema },
    };
    const validator = this._ajv.compile(validationSchema);

    return (req: Request, _res) => {
      const value =
        param.in === "path"
          ? req.params[arg.parameterName]
          : req.query[arg.parameterName];

      checkRequired(value);

      const data = { value };

      if (!validator(data)) {
        if (param.in === "path") {
          throw new NotFound();
        } else {
          throw new BadRequest(
            `Query parameter ${
              arg.parameterName
            } is invalid: ${this._ajv.errorsText(validator.errors)}.`
          );
        }
      }

      return data.value;
    };
  }
```
