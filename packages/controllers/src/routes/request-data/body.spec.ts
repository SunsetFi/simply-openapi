import { MockRequest } from "@jest-mock/express/dist/src/request";
import { getMockReq } from "@jest-mock/express";
import { merge } from "lodash";
import { PartialDeep } from "type-fest";
import { BadRequest } from "http-errors";
import "jest-extended";

import { RequestDataProcessorFactoryContext } from "./types";
import { bodyRequestDataExtractorFactory } from "./body";
import { ValidationError } from "ajv";
import { SchemaObject } from "openapi3-ts/oas31";

describe("bodyRequestDataExtractorFactory", function () {
  const valueProcessor = jest.fn((value) => value);
  const createValueProcessor = jest.fn((schema: any) => valueProcessor);
  beforeEach(() => {
    valueProcessor.mockReset();
    valueProcessor.mockImplementation((value) => value);

    createValueProcessor.mockReset();
    createValueProcessor.mockImplementation((schema: any) => valueProcessor);
  });

  function invoke(
    ctx: PartialDeep<RequestDataProcessorFactoryContext>,
    req: MockRequest,
  ) {
    const processor = bodyRequestDataExtractorFactory(
      merge(
        {
          spec: {
            openapi: "3.0.0",
            info: {
              title: "Test",
              version: "1.0.0",
            },
          },
          path: "/",
          method: "get",
          pathItem: {},
          operation: {},
          controller: {},
          handler: () => {},
          createValueProcessor,
        } as any,
        ctx,
      ),
    )!;

    return processor(getMockReq(req));
  }

  it("returns the body as-is if no requestBody is present", function () {
    const body = {
      foo: "bar",
    };

    const result = invoke(
      {},
      {
        body,
      },
    );

    expect(result).toEqual({ body });
  });

  it("resolves request body references", function () {
    const body = {
      foo: "bar",
    };

    const result = invoke(
      {
        operation: {
          requestBody: {
            $ref: "#/components/requestBodies/testBody",
          },
        },
        spec: {
          components: {
            requestBodies: {
              testBody: {
                required: true,
                content: {},
              },
            },
          },
        },
      },
      { body },
    );

    expect(result).toEqual({ body });
  });

  it("throws if the request body is an unknown reference", function () {
    const test = () =>
      invoke(
        {
          operation: {
            requestBody: {
              $ref: "#/components/requestBodies/testBody",
            },
          },
        },
        {},
      );

    expect(test).toThrowWithMessage(Error, /Could not resolve requestBody/);
  });

  it("returns the body as-is if no content is present", function () {
    const body = {
      foo: "bar",
    };

    const result = invoke(
      {
        operation: {
          requestBody: {},
        },
      },
      { body },
    );

    expect(result).toEqual({ body });
  });

  it("throws bad request when a required body is not provided", function () {
    const test = () =>
      invoke(
        {
          operation: {
            requestBody: {
              required: true,
            },
          },
        },
        { body: {} },
      );

    expect(test).toThrowWithMessage(BadRequest, /Request body is required/);
  });

  it("builds a processor for a given body schema", function () {
    const schema: SchemaObject = {
      type: "object",
      properties: {
        foo: {
          type: "integer",
        },
      },
    };

    invoke(
      {
        operation: {
          requestBody: {
            content: {
              "*/*": {
                schema,
              },
            },
          },
        },
      },
      {},
    );

    expect(createValueProcessor).toHaveBeenCalledWith(schema);
  });

  it("calls the processor for a given body", function () {
    const body = {
      foo: "a",
    };
    const schema: SchemaObject = {
      type: "object",
      properties: {
        foo: {
          type: "integer",
        },
      },
    };

    invoke(
      {
        operation: {
          requestBody: {
            content: {
              "*/*": {
                schema,
              },
            },
          },
        },
      },
      { body },
    );

    expect(valueProcessor).toHaveBeenCalledWith(body);
  });

  it("calls the correct processor based on content-type", function () {
    const contentType = "foo/bar";
    const body = {
      foo: "a",
    };

    const schemaAny: SchemaObject = {
      "x-for": "any",
      type: "object",
      properties: {
        foo: {
          type: "string",
        },
      },
    };

    const schemaFoo: SchemaObject = {
      "x-for": "foo",
      type: "object",
      properties: {
        foo: {
          type: "string",
        },
      },
    };

    const schemaFooBar: SchemaObject = {
      "x-for": "foo/bar",
      type: "object",
      properties: {
        foo: {
          type: "string",
        },
      },
    };

    let valueProcessors = new Map<string, ReturnType<typeof jest.fn>>();

    const createValueProcessor = jest.fn((schema: SchemaObject) => {
      const processor = jest.fn((value) => value);
      valueProcessors.set(schema["x-for"], processor);
      return processor;
    });

    invoke(
      {
        operation: {
          requestBody: {
            content: {
              "*/*": {
                schema: schemaAny,
              },
              "foo/bar": {
                schema: schemaFooBar,
              },
              "foo/*": {
                schema: schemaFoo,
              },
            },
          },
        },
        createValueProcessor,
      },
      { body, headers: { "content-type": contentType } },
    );

    expect(createValueProcessor).toHaveBeenCalledWith(schemaFooBar);

    const fooBarProcessor = valueProcessors.get("foo/bar");
    expect(fooBarProcessor).toHaveBeenCalledWith(body);

    for (const [schema, processor] of valueProcessors) {
      if (schema !== "foo/bar") {
        expect(processor).not.toHaveBeenCalled();
      }
    }
  });

  it("throws bad request for requests that fail validation", function () {
    const body = {
      foo: "a",
    };

    valueProcessor.mockImplementation(() => {
      throw new ValidationError([
        {
          data: "a",
          keyword: "type",
          message: "should be integer",
          params: {
            type: "integer",
          },
          schemaPath: "#/properties/foo/type",
        },
      ]);
    });

    const test = () =>
      invoke(
        {
          operation: {
            requestBody: {
              content: {
                "*/*": {
                  schema: {
                    $ref: "#/components/schemas/Test",
                  },
                },
              },
            },
          },
          spec: {
            components: {
              schemas: {
                Test: {
                  type: "object",
                  properties: {
                    foo: {
                      type: "integer",
                    },
                  },
                },
              },
            },
          },
        },
        { body },
      );

    expect(test).toThrowWithMessage(BadRequest, /Invalid request body/);
  });

  it("resolves schema references", function () {
    const schema: SchemaObject = {
      type: "object",
      properties: {
        foo: {
          type: "integer",
        },
      },
    };

    invoke(
      {
        operation: {
          requestBody: {
            content: {
              "*/*": {
                schema: {
                  $ref: "#/components/schemas/Test",
                },
              },
            },
          },
        },
        spec: {
          components: {
            schemas: {
              Test: schema,
            },
          },
        },
      },
      {},
    );

    expect(createValueProcessor).toHaveBeenCalledWith(schema);
  });

  it("throws an error when the schema reference is unknown", function () {
    const body = {
      foo: "a",
    };
    const test = () =>
      invoke(
        {
          operation: {
            requestBody: {
              content: {
                "*/*": {
                  schema: {
                    $ref: "#/components/schemas/Test",
                  },
                },
              },
            },
          },
        },
        { body },
      );

    expect(test).toThrowWithMessage(
      Error,
      /Could not resolve requestBody schema reference/,
    );
  });
});
