import { merge } from "lodash";
import { PartialDeep } from "type-fest";
import { BadRequest } from "http-errors";
import { ValidationError } from "ajv";
import {
  OpenAPIObject,
  ReferenceObject,
  RequestBodyObject,
  SchemaObject,
} from "openapi3-ts/oas31";
import { getMockReq, getMockRes } from "@jest-mock/express";
import { MockRequest } from "@jest-mock/express/dist/src/request";
import "jest-extended";

import { RequestContext } from "../../RequestContext";

const valueProcessor = jest.fn((value) => value);
const createValueProcessor = jest.fn((schema: any) => valueProcessor);

beforeEach(() => {
  valueProcessor.mockReset();
  valueProcessor.mockImplementation((value) => value);

  createValueProcessor.mockReset();
  createValueProcessor.mockImplementation((schema: any) => valueProcessor);
});

jest.mock("./SchemaObjectProcessorFactory", () => {
  return {
    SchemaObjectProcessorFactory: jest.fn().mockImplementation(() => {
      return {
        createValueProcessor,
      };
    }),
  };
});

import { OperationMiddlewareFactoryContext } from "./OperationMiddlewareFactoryContext";

import { bodyProcessorMiddlewareFactory } from "./body-processor";
import { OperationHandlerMiddleware } from "./types";

describe("bodyProcessorMiddlewareFactory", function () {
  function createSut(
    requestBody: RequestBodyObject | ReferenceObject | undefined,
    path: string = "/",
    additionalSpec?: PartialDeep<OpenAPIObject>,
  ): [OperationHandlerMiddleware, (req: MockRequest) => RequestContext] {
    const spec = merge(
      {
        openapi: "3.0.0",
        info: {
          title: "Test",
          version: "1.0.0",
        },
        paths: {
          [path]: {
            get: {
              requestBody,
              responses: {},
            },
          },
        },
      } as OpenAPIObject,
      additionalSpec,
    );

    const ctx = new OperationMiddlewareFactoryContext(
      spec,
      path,
      "get",
      {},
      () => {},
      [],
      null as any,
    );

    const createRequestCtx = (req: MockRequest) =>
      new RequestContext(
        spec,
        path,
        "get",
        {},
        () => {},
        [],
        getMockReq(req),
        getMockRes().res,
      );

    const middleware = bodyProcessorMiddlewareFactory(ctx);

    return [middleware, createRequestCtx];
  }

  it("returns the body as-is if no requestBody is present", function () {
    const body = {
      foo: "bar",
    };

    const [middleware, createRequestCtx] = createSut(undefined);

    const ctx = createRequestCtx({ body });
    const nextResult = {};
    const next = jest.fn().mockReturnValue(nextResult);
    const result = middleware(ctx, next);

    expect(ctx.getRequestData("openapi-body")).toBe(body);
    expect(next).toHaveBeenCalled();
    expect(result).toBe(nextResult);
  });

  it("resolves request body references", function () {
    const schema = { "x-is-schema": true };

    createSut(
      {
        $ref: "#/components/requestBodies/testBody",
      },
      "/",
      {
        components: {
          requestBodies: {
            testBody: {
              required: true,
              content: {
                "*/*": { schema },
              },
            },
          },
        },
      },
    );

    expect(createValueProcessor).toHaveBeenCalledWith(schema);
  });

  it("throws if the request body is an unknown reference", function () {
    const test = () =>
      createSut({ $ref: "#/components/requestBodies/testBody" });

    expect(test).toThrowWithMessage(Error, /Could not resolve requestBody/);
  });

  it("returns the body as-is if no content is present", function () {
    const body = {
      foo: "bar",
    };

    const [middleware, createRequestCtx] = createSut(
      {
        content: {},
      },
      "/",
    );

    const ctx = createRequestCtx({ body });
    const nextResult = {};
    const next = jest.fn().mockReturnValue(nextResult);
    const result = middleware(ctx, next);

    expect(ctx.getRequestData("openapi-body")).toBe(body);
    expect(next).toHaveBeenCalled();
    expect(result).toBe(nextResult);
  });

  it("throws bad request when a required body is not provided", function () {
    const [middleware, createRequestCtx] = createSut({
      required: true,
      content: {},
    });

    const ctx = createRequestCtx({ body: {} });
    const next = jest.fn();
    const test = () => middleware(ctx, next);

    expect(test).toThrowWithMessage(BadRequest, /Request body is required/);
    expect(next).not.toHaveBeenCalled();
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

    createSut({
      content: {
        "*/*": {
          schema,
        },
      },
    });

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

    const [middleware, createRequestCtx] = createSut({
      content: {
        "*/*": {
          schema,
        },
      },
    });

    const ctx = createRequestCtx({ body });
    const nextResult = {};
    const next = jest.fn().mockReturnValue(nextResult);
    const result = middleware(ctx, next);

    expect(ctx.getRequestData("openapi-body")).toBe(body);
    expect(next).toHaveBeenCalled();
    expect(result).toBe(nextResult);
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

    createValueProcessor.mockImplementation((schema: SchemaObject) => {
      const processor = jest.fn((value) => value);
      valueProcessors.set(schema["x-for"], processor);
      return processor;
    });

    const [middleware, createRequestCtx] = createSut({
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
    });

    const ctx = createRequestCtx({
      body,
      headers: { "content-type": contentType },
    });
    const nextResult = {};
    const next = jest.fn().mockReturnValue(nextResult);
    const result = middleware(ctx, next);

    expect(ctx.getRequestData("openapi-body")).toBe(body);
    expect(next).toHaveBeenCalled();
    expect(result).toBe(nextResult);

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
          instancePath: "",
          params: {
            type: "integer",
          },
          schemaPath: "#/properties/foo/type",
        },
      ]);
    });

    const [middleware, createRequestCtx] = createSut({
      content: {
        "*/*": {
          schema: {
            type: "object",
            properties: {
              foo: {
                type: "integer",
              },
            },
          },
        },
      },
    });

    const ctx = createRequestCtx({
      body,
    });
    const nextResult = {};
    const next = jest.fn().mockReturnValue(nextResult);
    const test = () => middleware(ctx, next);

    expect(test).toThrowWithMessage(
      BadRequest,
      /Invalid request body: value should be integer/,
    );
    expect(next).not.toHaveBeenCalled();
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

    createSut(
      {
        content: {
          "*/*": {
            schema: {
              $ref: "#/components/schemas/Test",
            },
          },
        },
      },
      "/",
      {
        components: {
          schemas: {
            Test: schema,
          },
        },
      },
    );

    expect(createValueProcessor).toHaveBeenCalledWith(schema);
  });

  it("throws an error when the schema reference is unknown", function () {
    const test = () =>
      createSut({
        content: {
          "*/*": {
            schema: {
              $ref: "#/components/schemas/Test",
            },
          },
        },
      });

    expect(test).toThrowWithMessage(
      Error,
      /Could not resolve requestBody schema reference/,
    );
  });
});
