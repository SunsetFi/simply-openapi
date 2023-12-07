import {
  OpenAPIObject,
  ParameterObject,
  ReferenceObject,
  SchemaObject,
} from "openapi3-ts/oas31";
import { merge } from "lodash";
import { getMockReq, getMockRes } from "@jest-mock/express";
import { PartialDeep } from "type-fest";
import { NotFound, BadRequest } from "http-errors";
import { ValidationError } from "ajv";
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

import { parametersRequestProcessorFactory } from "./parameters";
import { RequestProcessorFactoryContext } from "./RequestProcessorFactoryContext";
import { RequestProcessor } from "./types";

describe("parametersRequestProcessorFactory", function () {
  function createProcessor(
    param: ParameterObject | ReferenceObject,
    path: string = "/",
    additionalSpec?: PartialDeep<OpenAPIObject>,
  ): (req: MockRequest) => ReturnType<RequestProcessor> {
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
              parameters: [param],
              responses: {},
            },
          },
        },
      } as OpenAPIObject,
      additionalSpec,
    );

    const ctx = new RequestProcessorFactoryContext(
      spec,
      path,
      "get",
      {},
      () => {},
      [],
      null as any,
    );

    const processor = parametersRequestProcessorFactory(ctx);

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

    return (req) => processor!(createRequestCtx(req));
  }

  beforeEach(() => {
    valueProcessor.mockReset();
    valueProcessor.mockImplementation((value) => value);

    createValueProcessor.mockReset();
    createValueProcessor.mockImplementation((schema: any) => valueProcessor);
  });

  it("creates a value processor for a parameter", function () {
    const param: ParameterObject = {
      name: "foo",
      in: "query",
      schema: {
        type: "string",
      },
    };

    createProcessor(param);

    expect(createValueProcessor).toHaveBeenCalledWith(param.schema);
  });

  it("creates a value processor for a ref parameter", function () {
    const schema: SchemaObject = {
      type: "string",
    };

    createProcessor({ $ref: "#/components/parameters/foo" }, "/", {
      components: {
        parameters: {
          foo: {
            name: "foo",
            in: "query",
            schema,
          },
        },
      },
    });

    expect(createValueProcessor).toHaveBeenCalledWith(schema);
  });

  it("uses the value processor to process the parameter", function () {
    const param: ParameterObject = {
      name: "foo",
      in: "query",
      schema: {
        type: "string",
      },
    };

    const processor = createProcessor(param);

    processor({
      query: {
        foo: "bar",
      },
    });

    expect(valueProcessor).toHaveBeenCalledWith("bar");
  });

  describe("path params", function () {
    it("returns the path param value", function () {
      const name = "foo";
      const value = "bar";

      const param: ParameterObject = {
        name,
        in: "path",
        schema: {
          type: "string",
        },
      };

      const processor = createProcessor(param, `/{${name}}`);

      expect(
        processor({
          params: {
            [name]: value,
          },
        }),
      ).toEqual({ parameters: { [name]: value } });
    });

    it("returns 404 if the the path param is not present", function () {
      const name = "foo";

      const param: ParameterObject = {
        name,
        in: "path",
        schema: {
          type: "string",
        },
      };

      const processor = createProcessor(param, `/{${name}}`);

      expect(() =>
        processor({
          params: {},
        }),
      ).toThrow(NotFound);
    });

    it("returns 404 if the the path param is not valid", function () {
      const name = "foo";
      const value = "bar";

      const param: ParameterObject = {
        name,
        in: "path",
        schema: {
          type: "integer",
        },
      };

      const processor = createProcessor(param, `/{${name}}`);
      valueProcessor.mockImplementation(() => {
        throw new ValidationError([
          {
            keyword: "type",
            message: "should be integer",
            params: {
              type: "integer",
            },
          },
        ]);
      });

      expect(() =>
        processor({
          params: {
            [name]: value,
          },
        }),
      ).toThrow(NotFound);
    });
  });

  describe("query params", function () {
    it("returns the query param value", function () {
      const name = "foo";
      const value = "bar";

      const param: ParameterObject = {
        name,
        in: "query",
        schema: {
          type: "string",
        },
      };

      const processor = createProcessor(param);

      expect(
        processor({
          query: {
            [name]: value,
          },
        }),
      ).toEqual({ parameters: { [name]: value } });
    });

    it("provides undefined if the optional query param is not present", function () {
      const name = "foo";

      const param: ParameterObject = {
        name,
        in: "query",
        schema: {
          type: "string",
        },
      };

      const processor = createProcessor(param);

      expect(
        processor({
          query: {},
        }),
      ).toMatchObject({
        parameters: {
          [name]: undefined,
        },
      });
    });

    it("returns 400 if the the required query param is not present", function () {
      const name = "foo";

      const param: ParameterObject = {
        name,
        in: "query",
        required: true,
        schema: {
          type: "string",
        },
      };

      const processor = createProcessor(param);

      expect(() =>
        processor({
          query: {},
        }),
      ).toThrowWithMessage(BadRequest, /Query parameter "foo" is required/);
    });

    it("returns 400 if the the query param is not valid", function () {
      const name = "foo";
      const value = "bar";

      const param: ParameterObject = {
        name,
        in: "query",
        schema: {
          type: "integer",
        },
      };

      const processor = createProcessor(param);
      valueProcessor.mockImplementation(() => {
        throw new ValidationError([
          {
            keyword: "type",
            message: "should be integer",
            params: {
              type: "integer",
            },
          },
        ]);
      });

      expect(() =>
        processor({
          query: {
            [name]: value,
          },
        }),
      ).toThrowWithMessage(
        BadRequest,
        /Query parameter "foo" is invalid: value should be integer/,
      );
    });
  });

  describe("header params", function () {
    it("returns the header param value", function () {
      const name = "foo";
      const value = "bar";

      const param: ParameterObject = {
        name,
        in: "header",
        schema: {
          type: "string",
        },
      };

      const processor = createProcessor(param);

      expect(
        processor({
          headers: {
            [name]: value,
          },
        }),
      ).toEqual({ parameters: { [name]: value } });
    });

    it("provides undefined if the optional header param is not present", function () {
      const name = "foo";

      const param: ParameterObject = {
        name,
        in: "header",
        schema: {
          type: "string",
        },
      };

      const processor = createProcessor(param);

      expect(
        processor({
          headers: {},
        }),
      ).toMatchObject({
        parameters: {
          [name]: undefined,
        },
      });
    });

    it("returns 400 if the the required header param is not present", function () {
      const name = "foo";

      const param: ParameterObject = {
        name,
        in: "header",
        required: true,
        schema: {
          type: "string",
        },
      };

      const processor = createProcessor(param);

      expect(() =>
        processor({
          headers: {},
        }),
      ).toThrowWithMessage(BadRequest, /Header parameter "foo" is required/);
    });

    it("returns 400 if the the header param is not valid", function () {
      const name = "foo";
      const value = "bar";

      const param: ParameterObject = {
        name,
        in: "header",
        schema: {
          type: "integer",
        },
      };

      const processor = createProcessor(param);
      valueProcessor.mockImplementation(() => {
        throw new ValidationError([
          {
            keyword: "type",
            message: "should be integer",
            params: {
              type: "integer",
            },
          },
        ]);
      });

      expect(() =>
        processor({
          headers: {
            [name]: value,
          },
        }),
      ).toThrowWithMessage(
        BadRequest,
        /Header parameter "foo" is invalid: value should be integer/,
      );
    });
  });

  describe("cookie params", function () {
    it("returns the cookie param value", function () {
      const name = "foo";
      const value = "bar";

      const param: ParameterObject = {
        name,
        in: "cookie",
        schema: {
          type: "string",
        },
      };

      const processor = createProcessor(param);

      expect(
        processor({
          cookies: {
            [name]: value,
          },
        }),
      ).toEqual({ parameters: { [name]: value } });
    });

    it("provides undefined if the optional cookie param is not present", function () {
      const name = "foo";

      const param: ParameterObject = {
        name,
        in: "cookie",
        schema: {
          type: "string",
        },
      };

      const processor = createProcessor(param);

      expect(
        processor({
          cookies: {},
        }),
      ).toMatchObject({
        parameters: {
          [name]: undefined,
        },
      });
    });

    it("returns 400 if the the required cookie param is not present", function () {
      const name = "foo";

      const param: ParameterObject = {
        name,
        in: "cookie",
        required: true,
        schema: {
          type: "string",
        },
      };

      const processor = createProcessor(param);

      expect(() =>
        processor({
          cookie: {},
        }),
      ).toThrowWithMessage(BadRequest, /Cookie parameter "foo" is required/);
    });

    it("returns 400 if the the cookie param is not valid", function () {
      const name = "foo";
      const value = "bar";

      const param: ParameterObject = {
        name,
        in: "cookie",
        schema: {
          type: "integer",
        },
      };

      const processor = createProcessor(param);
      valueProcessor.mockImplementation(() => {
        throw new ValidationError([
          {
            keyword: "type",
            message: "should be integer",
            params: {
              type: "integer",
            },
          },
        ]);
      });

      expect(() =>
        processor({
          cookies: {
            [name]: value,
          },
        }),
      ).toThrowWithMessage(
        BadRequest,
        /Cookie parameter "foo" is invalid: value should be integer/,
      );
    });
  });
});
