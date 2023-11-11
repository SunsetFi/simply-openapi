import { OpenAPIObject, OperationObject } from "openapi3-ts/oas31";
import { getMockReq as getMockReqReal, getMockRes } from "@jest-mock/express";
import { MockRequest } from "@jest-mock/express/dist/src/request";
import { Request, Response } from "express";
import { NotFound, BadRequest } from "http-errors";
import { merge } from "lodash";
import AJV from "ajv";
import addFormats from "ajv-formats";
import "jest-extended";

import {
  SOCControllerMethodExtensionData,
  SOCControllerMethodExtensionName,
  SOCControllerMethodHandlerArg,
} from "../../openapi/extensions/SOCControllerMethod";

import { CreateRouterOptions } from "../router-factory";
import {
  operationHandlerFallbackResponseMiddleware,
  operationHandlerJsonResponseMiddleware,
} from "../handler-middleware";

import { MethodHandler } from "./method-handler";

const ajv = new AJV({ coerceTypes: true, useDefaults: true });
addFormats(ajv);

describe("MethodHandler", function () {
  function getMockReq(opts: MockRequest) {
    return getMockReqReal({
      url: "http://www.webpt.com",
      path: "/",
      method: "get",
      ...opts,
    });
  }

  interface TestHandlerOptions {
    op: Partial<OperationObject>;
    handler: (...args: any) => any;
    handlerArgs: SOCControllerMethodHandlerArg[];
    opts?: CreateRouterOptions;
    mockReq?: MockRequest;
    spec?: Partial<OpenAPIObject>;
  }
  async function testHandler({
    op,
    handler,
    handlerArgs,
    opts = {},
    mockReq = {},
    spec = {},
  }: TestHandlerOptions): Promise<
    [next: jest.Mock, json: jest.Mock, req: Request, res: Response]
  > {
    const ext: SOCControllerMethodExtensionData = {
      controller: {},
      handler,
      handlerArgs,
    };

    op = {
      responses: {},
      ...op,
      [SOCControllerMethodExtensionName]: {
        ...ext,
        ...op[SOCControllerMethodExtensionName],
      },
    };

    const sut = new MethodHandler(
      merge(
        { openapi: "3.1.0", info: { title: "Test", version: "1.0.0" } },
        spec
      ),
      "path",
      {},
      "GET",
      op as OperationObject,
      ajv,
      {
        ...opts,
        handlerMiddleware: [
          operationHandlerFallbackResponseMiddleware,
          operationHandlerJsonResponseMiddleware,
          ...(opts.handlerMiddleware ?? []),
        ],
      }
    );

    const req = getMockReq(mockReq);
    const { res } = getMockRes();

    const [promise, next, json] = raceMocks(
      (err) => {},
      () => {
        res.headersSent = true;
        return res;
      }
    );

    res.json = json;

    sut.handle(req, res, next);

    await promise;

    return [next, json, req, res];
  }

  describe("controller resolution", function () {
    it("uses the controller resolver specified in resolveController", async function () {
      const inputController = "input";
      const handler = jest.fn(() => null);
      const outputController = {
        handler,
      };
      const resolver = jest.fn(() => outputController);
      const sut = new MethodHandler(
        { openapi: "3.1.0", info: { title: "Test", version: "1.0.0" } },
        "path",
        {},
        "GET",
        {
          responses: {},
          [SOCControllerMethodExtensionName]: {
            controller: inputController,
            handler: "handler",
            handlerArgs: [],
          } satisfies SOCControllerMethodExtensionData,
        } as OperationObject,
        ajv,
        {
          resolveController: resolver,
          handlerMiddleware: [
            operationHandlerFallbackResponseMiddleware,
            operationHandlerJsonResponseMiddleware,
          ],
        }
      );

      expect(resolver).toHaveBeenCalledWith(inputController);

      const req = getMockReq({});
      const { res } = getMockRes();

      const [promise, next, json] = raceMocks(
        (err) => {},
        () => {
          res.headersSent = true;
          return res;
        }
      );

      res.json = json;

      sut.handle(req, res, next);

      await promise;

      expect(next).not.toHaveBeenCalled();
      expect(handler).toHaveBeenCalled();
    });
  });

  describe("handler resolution", function () {
    it("resolves a handler from a string", async function () {
      const methodName = "testHandler";
      const handler = jest.fn(() => null);
      const inputController = {
        [methodName]: handler,
      };
      const sut = new MethodHandler(
        { openapi: "3.1.0", info: { title: "Test", version: "1.0.0" } },
        "path",
        {},
        "GET",
        {
          responses: {},
          [SOCControllerMethodExtensionName]: {
            controller: inputController,
            handler: methodName,
            handlerArgs: [],
          } satisfies SOCControllerMethodExtensionData,
        } as OperationObject,
        ajv,
        {
          handlerMiddleware: [
            operationHandlerFallbackResponseMiddleware,
            operationHandlerJsonResponseMiddleware,
          ],
        }
      );

      const req = getMockReq({});
      const { res } = getMockRes();

      const [promise, next, json] = raceMocks(
        (err) => {},
        () => {
          res.headersSent = true;
          return res;
        }
      );

      res.json = json;

      sut.handle(req, res, next);

      await promise;

      expect(next).not.toHaveBeenCalled();
      expect(handler).toHaveBeenCalled();
    });

    it("uses the handler resolver supplied by resolveHandler", async function () {
      const methodName = "testHandler";
      const handler = jest.fn(() => null);
      const resolver = jest.fn(() => handler);
      const inputController = {};
      const sut = new MethodHandler(
        { openapi: "3.1.0", info: { title: "Test", version: "1.0.0" } },
        "path",
        {},
        "GET",
        {
          responses: {},
          [SOCControllerMethodExtensionName]: {
            controller: inputController,
            handler: methodName,
            handlerArgs: [],
          } satisfies SOCControllerMethodExtensionData,
        } as OperationObject,
        ajv,
        {
          resolveHandler: resolver,
          handlerMiddleware: [
            operationHandlerFallbackResponseMiddleware,
            operationHandlerJsonResponseMiddleware,
          ],
        }
      );

      expect(resolver).toHaveBeenCalledWith(inputController, methodName);

      const req = getMockReq({});
      const { res } = getMockRes();

      const [promise, next, json] = raceMocks(
        (err) => {},
        () => {
          res.headersSent = true;
          return res;
        }
      );

      res.json = json;

      sut.handle(req, res, next);

      await promise;

      expect(next).not.toHaveBeenCalled();
      expect(handler).toHaveBeenCalled();
    });
  });

  describe("expressMiddleware", function () {
    it("applies the middleware", async function () {
      const middleware = jest.fn((req, res, next) => next());

      const [next] = await testHandler({
        op: {},
        handler: () => null,
        handlerArgs: [],
        opts: {
          expressMiddleware: [middleware],
        },
      });

      expect(next).not.toHaveBeenCalled();
      expect(middleware).toHaveBeenCalled();
    });
  });

  describe("handlerMiddleware", function () {
    it("applies the middleware in order", async function () {
      const middleware1 = jest.fn((ctx, next) => next());
      const middleware2 = jest.fn((ctx, next) => next());

      const [next] = await testHandler({
        op: {},
        handler: () => null,
        handlerArgs: [],
        opts: {
          handlerMiddleware: [middleware1, middleware2],
        },
      });

      expect(next).not.toHaveBeenCalled();
      expect(middleware1).toHaveBeenCalledBefore(middleware2);
    });
  });

  describe("parameters", function () {
    test.todo("Handles undefined parameters");

    it("supports the request parameter", async function () {
      const handler = jest.fn((arg) => null);
      const [next] = await testHandler({
        op: {},
        handler,
        handlerArgs: [
          {
            type: "request-raw",
          },
        ],
      });

      expect(next).not.toHaveBeenCalled();

      expect(handler).toHaveBeenCalledOnce();
      // It will not be the same request object, as we get piped through a Route
      expect(handler.mock.calls[0][0]).toSatisfy(isExpressRequest);
    });

    it("supports the response parameter", async function () {
      const handler = jest.fn((x) => null);
      const [next] = await testHandler({
        op: {},
        handler,
        handlerArgs: [
          {
            type: "response-raw",
          },
        ],
      });

      expect(next).not.toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith(expect.toSatisfy(isExpressResponse));
    });

    describe("openapi path parameters", function () {
      it("resolves $ref parameters", async function () {
        const handler = jest.fn((x) => null);

        const paramName = "pathParam";
        const paramValue = "12345";

        const [next] = await testHandler({
          spec: {
            components: {
              parameters: {
                pathParam: {
                  in: "path",
                  name: paramName,
                },
              },
            },
          },
          op: {
            parameters: [
              {
                $ref: `#/components/parameters/${paramName}`,
              },
            ],
          },
          handler,
          handlerArgs: [
            {
              type: "openapi-parameter",
              parameterName: paramName,
            },
          ],
          opts: {},
          mockReq: { params: { [paramName]: paramValue } },
        });

        expect(next).not.toHaveBeenCalled();
        expect(handler).toHaveBeenCalledWith(paramValue);
      });

      it("errors on unresolved $ref parameters", async function () {
        const test = () =>
          testHandler({
            op: {
              parameters: [
                {
                  $ref: "#/components/parameters/pathParam",
                },
              ],
            },
            handler: jest.fn(),
            handlerArgs: [
              {
                type: "openapi-parameter",
                parameterName: "pathParam",
              },
            ],
          });

        expect(test()).rejects.toThrowWithMessage(
          Error,
          /not found in operation parameters/
        );
      });

      describe("without schema", function () {
        it("gets passed a valid path parameter", async function () {
          const handler = jest.fn((x) => null);

          const paramValue = "pathParamValue";

          const [next] = await testHandler({
            op: {
              parameters: [
                {
                  in: "path",
                  name: "pathParam",
                },
              ],
            },
            handler,
            handlerArgs: [
              {
                type: "openapi-parameter",
                parameterName: "pathParam",
              },
            ],
            opts: {},
            mockReq: { params: { pathParam: paramValue } },
          });

          expect(next).not.toHaveBeenCalled();
          expect(handler).toHaveBeenCalledWith(paramValue);
        });

        it("throws a not found error when the param is not present.", async function () {
          const handler = jest.fn((x) => null);

          const [next] = await testHandler({
            op: {
              parameters: [
                {
                  in: "path",
                  name: "pathParam",
                },
              ],
            },
            handler,
            handlerArgs: [
              {
                type: "openapi-parameter",
                parameterName: "pathParam",
              },
            ],
            opts: {},
            mockReq: { params: {} },
          });

          expect(next).toHaveBeenCalled();
          expect(next.mock.calls[0][0]).toBeInstanceOf(NotFound);
        });
      });

      describe("with schema", function () {
        it("resolves a $ref schema", async function () {
          const handler = jest.fn((x) => null);

          const paramName = "pathParam";
          const paramValue = "12345";

          const [next] = await testHandler({
            spec: {
              components: {
                schemas: {
                  testSchema: {
                    type: "string",
                    minLength: 5,
                    maxLength: 5,
                  },
                },
              },
            },
            op: {
              parameters: [
                {
                  name: paramName,
                  in: "path",
                  schema: { $ref: "#/components/schemas/testSchema" },
                },
              ],
            },
            handler,
            handlerArgs: [
              {
                type: "openapi-parameter",
                parameterName: paramName,
              },
            ],
            opts: {},
            mockReq: { params: { [paramName]: paramValue } },
          });

          expect(next).not.toHaveBeenCalled();
          expect(handler).toHaveBeenCalledWith(paramValue);
        });

        it("throws an error on unresolved $ref schema", async function () {
          const test = () =>
            testHandler({
              op: {
                parameters: [
                  {
                    name: "pathParam",
                    in: "path",
                    schema: { $ref: "#/components/schemas/testSchema" },
                  },
                ],
              },
              handler: jest.fn(),
              handlerArgs: [
                {
                  type: "openapi-parameter",
                  parameterName: "pathParam",
                },
              ],
            });

          expect(test()).rejects.toThrowWithMessage(
            Error,
            /Could not resolve schema reference/
          );
        });

        it("gets passed a valid path parameter", async function () {
          const handler = jest.fn((x) => null);

          const paramValue = "12345";

          const [next] = await testHandler({
            op: {
              parameters: [
                {
                  in: "path",
                  name: "pathParam",
                  schema: { type: "string", minLength: 5, maxLength: 5 },
                },
              ],
            },
            handler,
            handlerArgs: [
              {
                type: "openapi-parameter",
                parameterName: "pathParam",
              },
            ],
            opts: {},
            mockReq: { params: { pathParam: paramValue } },
          });

          expect(next).not.toHaveBeenCalled();
          expect(handler).toHaveBeenCalledWith(paramValue);
        });

        it("throws a not found error when the param is not present.", async function () {
          const handler = jest.fn((x) => null);

          const [next] = await testHandler({
            op: {
              parameters: [
                {
                  in: "path",
                  name: "pathParam",
                },
              ],
            },
            handler,
            handlerArgs: [
              {
                type: "openapi-parameter",
                parameterName: "pathParam",
              },
            ],
            opts: {},
            mockReq: { params: {} },
          });
          expect(next).toHaveBeenCalled();
          expect(next.mock.calls[0][0]).toBeInstanceOf(NotFound);
        });

        it("throws a not found error when the param is not valid.", async function () {
          const handler = jest.fn((x) => null);

          const [next] = await testHandler({
            op: {
              parameters: [
                {
                  in: "path",
                  name: "pathParam",
                  schema: { type: "string", format: "date" },
                },
              ],
            },
            handler,
            handlerArgs: [
              {
                type: "openapi-parameter",
                parameterName: "pathParam",
              },
            ],
            opts: {},
            mockReq: { params: { pathParam: "invalid" } },
          });

          expect(next).toHaveBeenCalled();
          expect(next.mock.calls[0][0]).toBeInstanceOf(NotFound);
        });

        it("coerces the value.", async function () {
          const handler = jest.fn((x) => null);

          const paramValue = "54";

          const [next] = await testHandler({
            op: {
              parameters: [
                {
                  in: "path",
                  name: "pathParam",
                  schema: { type: "integer" },
                },
              ],
            },
            handler,
            handlerArgs: [
              {
                type: "openapi-parameter",
                parameterName: "pathParam",
              },
            ],
            opts: {},
            mockReq: { params: { pathParam: paramValue } },
          });

          expect(next).not.toHaveBeenCalled();
          expect(handler).toHaveBeenCalledWith(Number(paramValue));
        });
      });
    });

    describe("openapi query parameters", function () {
      describe("without schema", function () {
        it("gets passed a valid query parameter", async function () {
          const handler = jest.fn((x) => null);
          const paramValue = "queryValue";

          const [next] = await testHandler({
            op: {
              parameters: [
                {
                  in: "query",
                  name: "queryParam",
                },
              ],
            },
            handler,
            handlerArgs: [
              {
                type: "openapi-parameter",
                parameterName: "queryParam",
              },
            ],
            opts: {},
            mockReq: { query: { queryParam: paramValue } },
          });
          expect(next).not.toHaveBeenCalled();
          expect(handler).toHaveBeenCalledWith(paramValue);
        });

        it("provides undefined when the optional param is not present.", async function () {
          const handler = jest.fn((x) => null);

          const [next] = await testHandler({
            op: {
              parameters: [
                {
                  in: "query",
                  name: "queryParam",
                },
              ],
            },
            handler,
            handlerArgs: [
              {
                type: "openapi-parameter",
                parameterName: "queryParam",
              },
            ],
            opts: {},
            mockReq: { query: {} },
          });

          expect(next).not.toHaveBeenCalled();
          expect(handler).toHaveBeenCalledWith(undefined);
        });

        it("throws a bad request error when the required param is not present.", async function () {
          const handler = jest.fn((x) => null);

          const [next] = await testHandler({
            op: {
              parameters: [
                {
                  in: "query",
                  name: "queryParam",
                  required: true,
                },
              ],
            },
            handler,
            handlerArgs: [
              {
                type: "openapi-parameter",
                parameterName: "queryParam",
              },
            ],
            opts: {},
            mockReq: { query: {} },
          });

          expect(next).toHaveBeenCalled();
          expect(next.mock.calls[0][0]).toBeInstanceOf(BadRequest);
        });
      });

      describe("with schema", function () {
        it("gets passed a valid query parameter", async function () {
          const handler = jest.fn((x) => null);

          const paramValue = "12345";

          const [next] = await testHandler({
            op: {
              parameters: [
                {
                  in: "query",
                  name: "queryParam",
                  schema: { type: "string", minLength: 5, maxLength: 5 },
                },
              ],
            },
            handler,
            handlerArgs: [
              {
                type: "openapi-parameter",
                parameterName: "queryParam",
              },
            ],
            opts: {},
            mockReq: { query: { queryParam: paramValue } },
          });

          expect(next).not.toHaveBeenCalled();
          expect(handler).toHaveBeenCalledWith(paramValue);
        });

        it("passes undefined when the param is not present.", async function () {
          const handler = jest.fn((x) => null);

          const [next] = await testHandler({
            op: {
              parameters: [
                {
                  in: "query",
                  name: "queryParam",
                },
              ],
            },
            handler,
            handlerArgs: [
              {
                type: "openapi-parameter",
                parameterName: "queryParam",
              },
            ],
            opts: {},
            mockReq: { query: {} },
          });

          expect(next).not.toHaveBeenCalled();
          expect(handler).toHaveBeenCalledWith(undefined);
        });

        it("throws a bad request error when the required param is not present.", async function () {
          const handler = jest.fn((x) => null);

          const [next] = await testHandler({
            op: {
              parameters: [
                {
                  in: "query",
                  name: "queryParam",
                  required: true,
                },
              ],
            },
            handler,
            handlerArgs: [
              {
                type: "openapi-parameter",
                parameterName: "queryParam",
              },
            ],
            opts: {},
            mockReq: { query: {} },
          });

          expect(next).toHaveBeenCalled();
          expect(next.mock.calls[0][0]).toBeInstanceOf(BadRequest);
        });

        it("throws a bad request error when the param is not valid.", async function () {
          const handler = jest.fn((x) => null);

          const [next] = await testHandler({
            op: {
              parameters: [
                {
                  in: "query",
                  name: "queryParam",
                  schema: { type: "string", format: "date" },
                },
              ],
            },
            handler,
            handlerArgs: [
              {
                type: "openapi-parameter",
                parameterName: "queryParam",
              },
            ],
            opts: {},
            mockReq: { query: { queryParam: "invalid" } },
          });

          expect(next).toHaveBeenCalled();
          expect(next.mock.calls[0][0]).toBeInstanceOf(BadRequest);
        });

        it("coerces the value.", async function () {
          const handler = jest.fn((x) => null);

          const paramValue = "54";

          const [next] = await testHandler({
            op: {
              parameters: [
                {
                  in: "query",
                  name: "queryParam",
                  schema: { type: "integer" },
                },
              ],
            },
            handler,
            handlerArgs: [
              {
                type: "openapi-parameter",
                parameterName: "queryParam",
              },
            ],
            opts: {},
            mockReq: { query: { queryParam: paramValue } },
          });

          expect(next).not.toHaveBeenCalled();
          expect(handler).toHaveBeenCalledWith(Number(paramValue));
        });
      });
    });

    describe("openapi body parameter", function () {
      describe("without an openapi requestBody", function () {
        it("provides the raw body object", async function () {
          const handler = jest.fn((x) => null);

          const bodyValue = "hello world";

          const [next] = await testHandler({
            op: {},
            handler,
            handlerArgs: [
              {
                type: "request-body",
              },
            ],
            opts: {},
            mockReq: { body: bodyValue },
          });

          expect(next).not.toHaveBeenCalled();
          expect(handler).toHaveBeenCalledWith(bodyValue);
        });
      });

      describe("with an openapi requstBody", function () {
        it("resolves $ref bodies", async function () {
          const handler = jest.fn((x) => null);

          const bodyValue = "hello world";

          const [next] = await testHandler({
            spec: {
              components: {
                requestBodies: {
                  testBody: {
                    content: {
                      "*/*": {},
                    },
                    required: true,
                  },
                },
              },
            },
            op: {
              requestBody: { $ref: "#/components/requestBodies/testBody" },
            },
            handler,
            handlerArgs: [
              {
                type: "request-body",
              },
            ],
            opts: {},
            mockReq: { body: bodyValue },
          });

          expect(next).not.toHaveBeenCalled();
          expect(handler).toHaveBeenCalledWith(bodyValue);
        });

        it("errors on unresolved $ref bodies", async function () {
          const handler = jest.fn((x) => null);

          const bodyValue = "hello world";

          const test = () =>
            testHandler({
              op: {
                requestBody: { $ref: "#/components/requestBodies/testBody" },
              },
              handler,
              handlerArgs: [
                {
                  type: "request-body",
                },
              ],
              opts: {},
              mockReq: { body: bodyValue },
            });

          expect(test()).rejects.toThrowWithMessage(
            Error,
            /Could not resolve requestBody reference/
          );
        });

        it("returns bad request when a required body is not supplied", async function () {
          const handler = jest.fn((x) => null);

          const bodyValue = undefined;

          const [next] = await testHandler({
            op: {
              requestBody: {
                required: true,
                content: {},
              },
            },
            handler,
            handlerArgs: [
              {
                type: "request-body",
              },
            ],
            opts: {},
            mockReq: { body: bodyValue },
          });

          expect(next).toHaveBeenCalled();
          expect(next.mock.calls[0][0]).toBeInstanceOf(BadRequest);
        });

        describe("schemas", function () {
          it("resolves $ref schemas", async function () {
            const handler = jest.fn((x) => null);

            const bodyValue = "12345";

            const [next] = await testHandler({
              spec: {
                components: {
                  schemas: {
                    bodySchema: {
                      type: "string",
                      minLength: 5,
                      maxLength: 5,
                    },
                  },
                },
              },
              op: {
                requestBody: {
                  required: true,
                  content: {
                    "*/*": {
                      schema: { $ref: "#/components/schemas/bodySchema" },
                    },
                  },
                },
              },
              handler,
              handlerArgs: [
                {
                  type: "request-body",
                },
              ],
              opts: {},
              mockReq: { body: bodyValue },
            });

            expect(next).not.toHaveBeenCalled();
            expect(handler).toHaveBeenCalledWith(bodyValue);
          });

          it("errors on unresolved $ref schemas", async function () {
            const handler = jest.fn((x) => null);

            const bodyValue = "12345";

            const test = () =>
              testHandler({
                op: {
                  requestBody: {
                    required: true,
                    content: {
                      "text/plain": {
                        schema: { $ref: "#/components/schemas/bodySchema" },
                      },
                    },
                  },
                },
                handler,
                handlerArgs: [
                  {
                    type: "request-body",
                  },
                ],
                opts: {},
                mockReq: { body: bodyValue },
              });
          });

          it("returns bad request when a body does not match the schema", async function () {
            const handler = jest.fn((x) => null);

            const bodyValue = "12345";

            const [next] = await testHandler({
              op: {
                requestBody: {
                  required: true,
                  content: {
                    "*/*": {
                      schema: {
                        type: "string",
                        minLength: 10,
                      },
                    },
                  },
                },
              },
              handler,
              handlerArgs: [
                {
                  type: "request-body",
                },
              ],
              opts: {},
              mockReq: { body: bodyValue },
            });

            expect(next).toHaveBeenCalled();
            expect(next.mock.calls[0][0]).toBeInstanceOf(BadRequest);
          });

          it("provides the body when the body matches the schema", async function () {
            const handler = jest.fn((x) => null);

            const bodyValue = "12345";

            const [next] = await testHandler({
              op: {
                requestBody: {
                  required: true,
                  content: {
                    "*/*": {
                      schema: {
                        type: "string",
                        minLength: 5,
                        maxLength: 5,
                      },
                    },
                  },
                },
              },
              handler,
              handlerArgs: [
                {
                  type: "request-body",
                },
              ],
              opts: {},
              mockReq: { body: bodyValue },
            });

            expect(next).not.toHaveBeenCalled();
            expect(handler).toHaveBeenCalledWith(bodyValue);
          });

          it("selects the right validator for the content type", async function () {
            const handler = jest.fn((x) => null);

            const bodyValue = "hello world";

            const [next] = await testHandler({
              op: {
                requestBody: {
                  required: true,
                  content: {
                    "*/*": {
                      schema: {
                        type: "string",
                      },
                    },
                    "foo/*": {
                      schema: {
                        type: "string",
                      },
                    },
                    "foo/bar": {
                      schema: {
                        type: "integer",
                      },
                    },
                  },
                },
              },
              handler,
              handlerArgs: [
                {
                  type: "request-body",
                },
              ],
              opts: {},
              mockReq: {
                body: bodyValue,
                headers: { "content-type": "foo/bar" },
              },
            });

            expect(next).toHaveBeenCalled();
            expect(next.mock.calls[0][0]).toBeInstanceOf(BadRequest);
          });

          it("coerces values", async function () {
            const handler = jest.fn((x) => null);

            const bodyValue = "12345";

            const [next] = await testHandler({
              op: {
                requestBody: {
                  required: true,
                  content: {
                    "*/*": {
                      schema: {
                        type: "integer",
                      },
                    },
                  },
                },
              },
              handler,
              handlerArgs: [
                {
                  type: "request-body",
                },
              ],
              opts: {},
              mockReq: { body: bodyValue },
            });

            expect(next).not.toHaveBeenCalled();
            expect(handler).toHaveBeenCalledWith(Number(bodyValue));
          });
        });
      });
    });
  });
});

function isExpressRequest(object: any): object is Request {
  return (
    "method" in object &&
    "url" in object &&
    "params" in object &&
    "query" in object
  );
}

function isExpressResponse(object: any): object is Response {
  return "statusCode" in object && "send" in object;
}

function raceMocks(
  ...handlers: ((...args: any[]) => any)[]
): [Promise<void>, ...jest.Mock[]] {
  let promises = new Array(handlers.length)
    .fill(0)
    .map((_) => deferrablePromise());
  let mocks = new Array(handlers.length).fill(0).map((_, i) =>
    jest.fn((...args: any[]) => {
      promises[i].resolve();
      return handlers[i](...args);
    })
  );
  return [Promise.race(promises.map((x) => x.promise)) as any, ...mocks];
}

function deferrablePromise() {
  let resolve: () => void;
  let reject: () => void;
  let promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve: () => resolve(),
    reject: () => reject(),
  };
}
