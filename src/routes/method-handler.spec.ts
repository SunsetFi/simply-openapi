import { OperationObject } from "openapi3-ts/oas31";
import { getMockReq as getMockReqReal, getMockRes } from "@jest-mock/express";
import { Request, Response } from "express";
import { NotFound, BadRequest } from "http-errors";
import "jest-extended";

import {
  SECControllerMethodExtensionData,
  SECControllerMethodExtensionName,
  SECControllerMethodHandlerArg,
} from "../openapi/extensions/SECControllerMethod";

import { MethodHandler } from "./method-handler";
import { CreateRouterOptions } from "./router-factory";
import {
  operationHandlerFallbackResponseMiddleware,
  operationHandlerJsonResponseMiddleware,
} from "./handler-middleware";
import { MockRequest } from "@jest-mock/express/dist/src/request";

describe("MethodHandler", function () {
  function createSut(op: OperationObject, opts: CreateRouterOptions = {}) {
    return new MethodHandler("path", {}, "GET", op, {
      ...opts,
      handlerMiddleware: [
        // FIXME: This is seeing headersSent false even when the below middleware sends it.
        operationHandlerFallbackResponseMiddleware,
        operationHandlerJsonResponseMiddleware,
        ...(opts.handlerMiddleware ?? []),
      ],
    });
  }

  function getMockReq(opts: MockRequest) {
    return getMockReqReal({
      url: "http://www.webpt.com",
      path: "/",
      method: "get",
      ...opts,
    });
  }

  async function testHandler(
    op: Partial<OperationObject>,
    handler: (...args: any) => any,
    handlerArgs: SECControllerMethodHandlerArg[],
    opts: CreateRouterOptions = {},
    mockReq: MockRequest = {}
  ): Promise<[next: jest.Mock, json: jest.Mock, req: Request, res: Response]> {
    const ext: SECControllerMethodExtensionData = {
      controller: {},
      handler,
      handlerArgs,
    };
    op = {
      responses: {},
      ...op,
      [SECControllerMethodExtensionName]: {
        ...ext,
        ...op[SECControllerMethodExtensionName],
      },
    };

    const sut = createSut(op as any, opts);

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

  describe("handlerMiddleware", function () {
    it("applies the middleware in order", async function () {
      const middleware1 = jest.fn((ctx, next) => next());
      const middleware2 = jest.fn((ctx, next) => next());

      const [next, json] = await testHandler({}, () => null, [], {
        handlerMiddleware: [middleware1, middleware2],
      });

      expect(next).not.toHaveBeenCalled();
      expect(middleware1).toHaveBeenCalledBefore(middleware2);
      expect(json).toHaveBeenCalledAfter(middleware2);
    });
  });

  describe("parameters", function () {
    it("supports the request parameter", async function () {
      const handler = jest.fn((arg) => null);
      const [next] = await testHandler({}, handler, [
        {
          type: "http-request",
        },
      ]);

      expect(next).not.toHaveBeenCalled();

      expect(handler).toHaveBeenCalledOnce();
      // It will not be the same request object, as we get piped through a Route
      expect(handler.mock.calls[0][0]).toSatisfy(isExpressRequest);
    });

    it("supports the response parameter", async function () {
      const handler = jest.fn((x) => null);
      const [next] = await testHandler({}, handler, [
        {
          type: "http-response",
        },
      ]);

      expect(next).not.toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith(expect.toSatisfy(isExpressResponse));
    });

    describe("openapi path parameters", function () {
      describe("without schema", function () {
        it("gets passed a valid path parameter", async function () {
          const handler = jest.fn((x) => null);

          const paramValue = "pathParamValue";

          const [next] = await testHandler(
            {
              parameters: [
                {
                  in: "path",
                  name: "pathParam",
                },
              ],
            },
            handler,
            [
              {
                type: "openapi-parameter",
                parameterName: "pathParam",
              },
            ],
            {},
            { params: { pathParam: paramValue } }
          );

          expect(next).not.toHaveBeenCalled();
          expect(handler).toHaveBeenCalledWith(paramValue);
        });

        it("throws a not found error when the param is not present.", async function () {
          const handler = jest.fn((x) => null);

          const [next] = await testHandler(
            {
              parameters: [
                {
                  in: "path",
                  name: "pathParam",
                },
              ],
            },
            handler,
            [
              {
                type: "openapi-parameter",
                parameterName: "pathParam",
              },
            ],
            {},
            { params: {} }
          );

          expect(next).toHaveBeenCalled();
          expect(next.mock.calls[0][0]).toBeInstanceOf(NotFound);
        });
      });

      describe("with schema", function () {
        it("gets passed a valid path parameter", async function () {
          const handler = jest.fn((x) => null);

          const paramValue = "12345";

          const [next] = await testHandler(
            {
              parameters: [
                {
                  in: "path",
                  name: "pathParam",
                  schema: { type: "string", minLength: 5, maxLength: 5 },
                },
              ],
            },
            handler,
            [
              {
                type: "openapi-parameter",
                parameterName: "pathParam",
              },
            ],
            {},
            { params: { pathParam: paramValue } }
          );

          expect(next).not.toHaveBeenCalled();
          expect(handler).toHaveBeenCalledWith(paramValue);
        });

        it("throws a not found error when the param is not present.", async function () {
          const handler = jest.fn((x) => null);

          const [next] = await testHandler(
            {
              parameters: [
                {
                  in: "path",
                  name: "pathParam",
                },
              ],
            },
            handler,
            [
              {
                type: "openapi-parameter",
                parameterName: "pathParam",
              },
            ],
            {},
            { params: {} }
          );
          expect(next).toHaveBeenCalled();
          expect(next.mock.calls[0][0]).toBeInstanceOf(NotFound);
        });

        it("throws a not found error when the param is not valid.", async function () {
          const handler = jest.fn((x) => null);

          const [next] = await testHandler(
            {
              parameters: [
                {
                  in: "path",
                  name: "pathParam",
                  schema: { type: "string", format: "date" },
                },
              ],
            },
            handler,
            [
              {
                type: "openapi-parameter",
                parameterName: "pathParam",
              },
            ],
            {},
            { params: { pathParam: "invalid" } }
          );

          expect(next).toHaveBeenCalled();
          expect(next.mock.calls[0][0]).toBeInstanceOf(NotFound);
        });

        it("coerces the value.", async function () {
          const handler = jest.fn((x) => null);

          const paramValue = "54";

          const [next] = await testHandler(
            {
              parameters: [
                {
                  in: "path",
                  name: "pathParam",
                  schema: { type: "integer" },
                },
              ],
            },
            handler,
            [
              {
                type: "openapi-parameter",
                parameterName: "pathParam",
              },
            ],
            {},
            { params: { pathParam: paramValue } }
          );

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

          const [next] = await testHandler(
            {
              parameters: [
                {
                  in: "query",
                  name: "queryParam",
                },
              ],
            },
            handler,
            [
              {
                type: "openapi-parameter",
                parameterName: "queryParam",
              },
            ],
            {},
            { query: { queryParam: paramValue } }
          );
          expect(next).not.toHaveBeenCalled();
          expect(handler).toHaveBeenCalledWith(paramValue);
        });

        it("provides undefined when the optional param is not present.", async function () {
          const handler = jest.fn((x) => null);

          const [next] = await testHandler(
            {
              parameters: [
                {
                  in: "query",
                  name: "queryParam",
                },
              ],
            },
            handler,
            [
              {
                type: "openapi-parameter",
                parameterName: "queryParam",
              },
            ],
            {},
            { query: {} }
          );

          expect(next).not.toHaveBeenCalled();
          expect(handler).toHaveBeenCalledWith(undefined);
        });

        it("throws a bad request error when the required param is not present.", async function () {
          const handler = jest.fn((x) => null);

          const [next] = await testHandler(
            {
              parameters: [
                {
                  in: "query",
                  name: "queryParam",
                  required: true,
                },
              ],
            },
            handler,
            [
              {
                type: "openapi-parameter",
                parameterName: "queryParam",
              },
            ],
            {},
            { query: {} }
          );

          expect(next).toHaveBeenCalled();
          expect(next.mock.calls[0][0]).toBeInstanceOf(BadRequest);
        });
      });

      describe("with schema", function () {
        it("gets passed a valid query parameter", async function () {
          const handler = jest.fn((x) => null);

          const paramValue = "12345";

          const [next] = await testHandler(
            {
              parameters: [
                {
                  in: "query",
                  name: "queryParam",
                  schema: { type: "string", minLength: 5, maxLength: 5 },
                },
              ],
            },
            handler,
            [
              {
                type: "openapi-parameter",
                parameterName: "queryParam",
              },
            ],
            {},
            { query: { queryParam: paramValue } }
          );

          expect(next).not.toHaveBeenCalled();
          expect(handler).toHaveBeenCalledWith(paramValue);
        });

        it("passes undefined when the param is not present.", async function () {
          const handler = jest.fn((x) => null);

          const [next] = await testHandler(
            {
              parameters: [
                {
                  in: "query",
                  name: "queryParam",
                },
              ],
            },
            handler,
            [
              {
                type: "openapi-parameter",
                parameterName: "queryParam",
              },
            ],
            {},
            { query: {} }
          );

          expect(next).not.toHaveBeenCalled();
          expect(handler).toHaveBeenCalledWith(undefined);
        });

        it("throws a bad request error when the required param is not present.", async function () {
          const handler = jest.fn((x) => null);

          const [next] = await testHandler(
            {
              parameters: [
                {
                  in: "query",
                  name: "queryParam",
                  required: true,
                },
              ],
            },
            handler,
            [
              {
                type: "openapi-parameter",
                parameterName: "queryParam",
              },
            ],
            {},
            { query: {} }
          );

          expect(next).toHaveBeenCalled();
          expect(next.mock.calls[0][0]).toBeInstanceOf(BadRequest);
        });

        it("throws a bad request error when the param is not valid.", async function () {
          const handler = jest.fn((x) => null);

          const [next] = await testHandler(
            {
              parameters: [
                {
                  in: "query",
                  name: "queryParam",
                  schema: { type: "string", format: "date" },
                },
              ],
            },
            handler,
            [
              {
                type: "openapi-parameter",
                parameterName: "queryParam",
              },
            ],
            {},
            { query: { queryParam: "invalid" } }
          );

          expect(next).toHaveBeenCalled();
          expect(next.mock.calls[0][0]).toBeInstanceOf(BadRequest);
        });

        it("coerces the value.", async function () {
          const handler = jest.fn((x) => null);

          const paramValue = "54";

          const [next] = await testHandler(
            {
              parameters: [
                {
                  in: "query",
                  name: "queryParam",
                  schema: { type: "integer" },
                },
              ],
            },
            handler,
            [
              {
                type: "openapi-parameter",
                parameterName: "queryParam",
              },
            ],
            {},
            { query: { queryParam: paramValue } }
          );

          expect(next).not.toHaveBeenCalled();
          expect(handler).toHaveBeenCalledWith(Number(paramValue));
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
