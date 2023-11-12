import { OpenAPIObject } from "openapi3-ts/oas31";
import { merge } from "lodash";
import { Request, Response, NextFunction } from "express";
import "jest-extended";

import {
  SOCControllerMetadata,
  SOCControllerMethodMetadata,
  setSOCControllerMetadata,
  setSOCControllerMethodMetadata,
} from "../../metadata";

import { SOCControllerMethodExtensionName } from "../extensions";
import {
  OperationHandlerMiddlewareContext,
  OperationHandlerMiddlewareNextFunction,
} from "../../routes";

import { extractSOCBoundMethodSpec } from "./bound-method";

describe("extractSOCBoundMethodSpec", function () {
  function createTestInstance(
    methodMetadata: SOCControllerMethodMetadata | null,
    controllerMetadata: SOCControllerMetadata | null
  ): [controller: object, methodName: string | symbol] {
    const methodName = "testMethod";
    class Controller {
      [methodName]() {}
    }

    if (controllerMetadata) {
      setSOCControllerMetadata(Controller, controllerMetadata);
    }

    if (methodMetadata) {
      setSOCControllerMethodMetadata(Controller, methodMetadata, methodName);
    }

    return [Controller, methodName];
  }

  function invoke(
    metadata: SOCControllerMethodMetadata | null,
    controllerMetadata: SOCControllerMetadata | null = null,
    input: Partial<OpenAPIObject> | null = null
  ): [
    result: Partial<OpenAPIObject> | undefined,
    controller: object,
    methodName: string | symbol,
  ] {
    const finalInput: OpenAPIObject = merge(
      {
        openapi: "3.1.0",
        info: {
          title: "Test",
          version: "1.0.0",
        },
      },
      input ?? {}
    );

    const [controller, methodName] = createTestInstance(
      metadata,
      controllerMetadata
    );

    let result = extractSOCBoundMethodSpec(controller, methodName);
    if (typeof result === "function") {
      result = result(finalInput);
    }

    if (result == null) {
      result = undefined;
    }

    return [result, controller, methodName];
  }

  it("no-ops when no method metadata is present", function () {
    expect(invoke(null)[0]).toBeUndefined();
  });

  it("no-ops when a custom method metadata is present", function () {
    const metadata: SOCControllerMethodMetadata = {
      path: "/test",
      method: "get",
      args: [],
      operationFragment: {},
    };

    expect(invoke(metadata)[0]).toBeUndefined();
  });

  it("errors when the operation does not exist", function () {
    const operationId = "foobar";

    const test = () =>
      invoke(
        {
          operationId,
          args: [],
        },
        null,
        {
          paths: {
            "/foo": {
              get: {
                operationId: "notfoobar",
                responses: {},
              },
            },
          },
        }
      );

    expect(test).toThrowWithMessage(Error, new RegExp(operationId));
  });

  it("decorates a bound operation", function () {
    const operationId = "foobar";

    const [result, controller, methodName] = invoke(
      {
        operationId,
        args: [],
      },
      null,
      {
        paths: {
          "/foo": {
            get: {
              operationId,
              responses: {},
            },
          },
        },
      }
    );

    expect(result).toMatchObject({
      paths: {
        "/foo": {
          get: {
            [SOCControllerMethodExtensionName]: {
              controller,
              handler: methodName,
              handlerArgs: [],
            },
          },
        },
      },
    });
  });

  describe("parameters", function () {
    it("decorates bound parameters", function () {
      const operationId = "foobar";
      const parameterName = "param1";

      const [result, controller, methodName] = invoke(
        {
          operationId,
          args: [
            {
              type: "openapi-parameter",
              parameterName,
            },
          ],
        },
        null,
        {
          paths: {
            "/foo": {
              get: {
                operationId,
                parameters: [
                  {
                    name: parameterName,
                    in: "query",
                  },
                ],
                responses: {},
              },
            },
          },
        }
      );

      expect(result).toMatchObject({
        paths: {
          "/foo": {
            get: {
              [SOCControllerMethodExtensionName]: {
                controller,
                handler: methodName,
                handlerArgs: [
                  {
                    type: "openapi-parameter",
                    parameterName,
                  },
                ],
              },
            },
          },
        },
      });
    });

    it("decorates bound referenced parameters", function () {
      const operationId = "foobar";
      const parameterName = "param1";

      const [result, controller, methodName] = invoke(
        {
          operationId,
          args: [
            {
              type: "openapi-parameter",
              parameterName,
            },
          ],
        },
        null,
        {
          paths: {
            "/foo": {
              get: {
                operationId,
                parameters: [
                  {
                    $ref: `#/components/parameters/${parameterName}`,
                  },
                ],
                responses: {},
              },
            },
          },
          components: {
            parameters: {
              [parameterName]: {
                name: parameterName,
                in: "query",
              },
            },
          },
        }
      );

      expect(result).toMatchObject({
        paths: {
          "/foo": {
            get: {
              [SOCControllerMethodExtensionName]: {
                controller,
                handler: methodName,
                handlerArgs: [
                  {
                    type: "openapi-parameter",
                    parameterName,
                  },
                ],
              },
            },
          },
        },
      });
    });

    it("throws when a bound parameter is not found", function () {
      const operationId = "foobar";
      const parameterName = "param1";

      const testFunc = () =>
        invoke(
          {
            operationId,
            args: [
              {
                type: "openapi-parameter",
                parameterName,
              },
            ],
          },
          null,
          {
            paths: {
              "/foo": {
                get: {
                  operationId,
                  parameters: [
                    {
                      name: "anotherparam",
                      in: "query",
                    },
                  ],
                  responses: {},
                },
              },
            },
          }
        );

      expect(testFunc).toThrowWithMessage(Error, new RegExp(parameterName));
    });
  });

  describe("pre express middleware", function () {
    it("configures controller middleware", function () {
      const operationId = "foobar";
      const middleware = (
        req: Request,
        res: Response,
        next: NextFunction
      ) => {};

      const [result] = invoke(
        {
          operationId,
          args: [],
        },
        {
          type: "bound",
          preExpressMiddleware: [middleware],
        },
        {
          paths: {
            "/foo": {
              get: {
                operationId,
                responses: {},
              },
            },
          },
        }
      );

      expect(result).toMatchObject({
        paths: {
          "/foo": {
            get: {
              [SOCControllerMethodExtensionName]: {
                preExpressMiddleware: [middleware],
              },
            },
          },
        },
      });
    });

    it("configures method middleware", function () {
      const operationId = "foobar";
      const middleware = (
        req: Request,
        res: Response,
        next: NextFunction
      ) => {};

      const [result] = invoke(
        {
          operationId,
          args: [],
          preExpressMiddleware: [middleware],
        },
        null,
        {
          paths: {
            "/foo": {
              get: {
                operationId,
                responses: {},
              },
            },
          },
        }
      );

      expect(result).toMatchObject({
        paths: {
          "/foo": {
            get: {
              [SOCControllerMethodExtensionName]: {
                preExpressMiddleware: [middleware],
              },
            },
          },
        },
      });
    });

    it("orders method middleware after controller middleware", function () {
      const operationId = "foobar";
      const controllerMiddleware = (
        req: Request,
        res: Response,
        next: NextFunction
      ) => {};
      const methodMiddleware = (
        req: Request,
        res: Response,
        next: NextFunction
      ) => {};

      const [result] = invoke(
        {
          operationId,
          args: [],
          preExpressMiddleware: [methodMiddleware],
        },
        {
          type: "bound",
          preExpressMiddleware: [controllerMiddleware],
        },
        {
          paths: {
            "/foo": {
              get: {
                operationId,
                responses: {},
              },
            },
          },
        }
      );

      expect(result).toMatchObject({
        paths: {
          "/foo": {
            get: {
              [SOCControllerMethodExtensionName]: {
                preExpressMiddleware: [controllerMiddleware, methodMiddleware],
              },
            },
          },
        },
      });
    });
  });

  test.todo("post express middleware");

  describe("handler middleware", function () {
    it("configures controller middleware", function () {
      const operationId = "foobar";
      const middleware = (
        ctx: OperationHandlerMiddlewareContext,
        next: OperationHandlerMiddlewareNextFunction
      ) => {};

      const [result] = invoke(
        {
          operationId,
          args: [],
        },
        {
          type: "bound",
          handlerMiddleware: [middleware],
        },
        {
          paths: {
            "/foo": {
              get: {
                operationId,
                responses: {},
              },
            },
          },
        }
      );

      expect(result).toMatchObject({
        paths: {
          "/foo": {
            get: {
              [SOCControllerMethodExtensionName]: {
                handlerMiddleware: [middleware],
              },
            },
          },
        },
      });
    });

    it("configures method middleware", function () {
      const operationId = "foobar";
      const middleware = (
        ctx: OperationHandlerMiddlewareContext,
        next: OperationHandlerMiddlewareNextFunction
      ) => {};

      const [result] = invoke(
        {
          operationId,
          args: [],
          handlerMiddleware: [middleware],
        },
        null,
        {
          paths: {
            "/foo": {
              get: {
                operationId,
                responses: {},
              },
            },
          },
        }
      );

      expect(result).toMatchObject({
        paths: {
          "/foo": {
            get: {
              [SOCControllerMethodExtensionName]: {
                handlerMiddleware: [middleware],
              },
            },
          },
        },
      });
    });

    it("orders method middleware after controller middleware", function () {
      const operationId = "foobar";
      const controllerMiddleware = (
        ctx: OperationHandlerMiddlewareContext,
        next: OperationHandlerMiddlewareNextFunction
      ) => {};
      const methodMiddleware = (
        ctx: OperationHandlerMiddlewareContext,
        next: OperationHandlerMiddlewareNextFunction
      ) => {};

      const [result] = invoke(
        {
          operationId,
          args: [],
          handlerMiddleware: [methodMiddleware],
        },
        {
          type: "bound",
          handlerMiddleware: [controllerMiddleware],
        },
        {
          paths: {
            "/foo": {
              get: {
                operationId,
                responses: {},
              },
            },
          },
        }
      );

      expect(result).toMatchObject({
        paths: {
          "/foo": {
            get: {
              [SOCControllerMethodExtensionName]: {
                handlerMiddleware: [controllerMiddleware, methodMiddleware],
              },
            },
          },
        },
      });
    });
  });
});
