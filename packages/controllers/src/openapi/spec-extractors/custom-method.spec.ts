import { OpenAPIObject, OperationObject } from "openapi3-ts/oas31";
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

import { extractSOCCustomMethodSpec } from "./custom-method";

describe("extractSOCCustomMethodSpec", function () {
  function createTestInstance(
    methodMetadata: SOCControllerMethodMetadata | null,
    controllerMetadata: SOCControllerMetadata | null
  ): [controller: object, methodName: string | symbol] {
    const methodName = "testMethod";
    const controller = {
      [methodName]() {},
    };

    if (controllerMetadata) {
      setSOCControllerMetadata(controller, controllerMetadata);
    }

    if (methodMetadata) {
      setSOCControllerMethodMetadata(controller, methodMetadata, methodName);
    }

    return [controller, methodName];
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

    let result = extractSOCCustomMethodSpec(controller, methodName);
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

  it("no-ops when a bound method metadata is present", function () {
    const metadata: SOCControllerMethodMetadata = {
      operationId: "foobar",
      args: [],
    };

    expect(invoke(metadata)[0]).toBeUndefined();
  });

  it("throws if a custom method is present on a bound controller", function () {
    const test = () =>
      invoke(
        {
          method: "get",
          path: "/foo",
          args: [],
          operationFragment: {},
        },
        {
          type: "bound",
        }
      );

    expect(test).toThrowWithMessage(Error, /is a bound controller/);
  });

  it("creates the extension for a custom method", function () {
    const path = "/foo";
    const method = "get";

    const [result, controller, methodName] = invoke({
      method,
      path,
      args: [],
      operationFragment: {},
    });

    expect(result).toMatchObject({
      paths: {
        [path]: {
          [method]: {
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

  it("applies the fragment", function () {
    const path = "/foo";
    const method = "get";

    const operationFragment: Partial<OperationObject> = {
      tags: ["foo"],
    };

    const [result] = invoke({
      method,
      path,
      args: [],
      operationFragment,
    });

    expect(result).toMatchObject({
      paths: {
        [path]: {
          [method]: {
            ...operationFragment,
          },
        },
      },
    });
  });

  describe("tags", function () {
    it("applies controller tags", function () {
      const path = "/foo";
      const method = "get";
      const tags = ["tag"];

      const operationFragment: Partial<OperationObject> = {};

      const [result] = invoke(
        {
          method,
          path,
          args: [],
          operationFragment,
        },
        {
          type: "custom",
          tags,
        }
      );

      expect(result).toMatchObject({
        paths: {
          [path]: {
            [method]: {
              tags,
            },
          },
        },
      });
    });

    it("merges controller and method tags", function () {
      const path = "/foo";
      const method = "get";
      const controllerTags = ["controller-tag"];
      const methodTags = ["method-tag"];

      const operationFragment: Partial<OperationObject> = {
        tags: methodTags,
      };

      const [result] = invoke(
        {
          method,
          path,
          args: [],
          operationFragment,
        },
        {
          type: "custom",
          tags: controllerTags,
        }
      );

      expect(result).toMatchObject({
        paths: {
          [path]: {
            [method]: {
              tags: [...controllerTags, ...methodTags],
            },
          },
        },
      });
    });
  });

  describe("express middleware", function () {
    it("configures controller middleware", function () {
      const middleware = (
        req: Request,
        res: Response,
        next: NextFunction
      ) => {};

      const [result] = invoke(
        {
          method: "get",
          path: "/foo",
          args: [],
          operationFragment: {},
        },
        {
          type: "custom",
          expressMiddleware: [middleware],
        },
        {
          paths: {
            "/foo": {
              get: {
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
                expressMiddleware: [middleware],
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
          method: "get",
          path: "/foo",
          args: [],
          operationFragment: {},
          expressMiddleware: [middleware],
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
                expressMiddleware: [middleware],
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
          method: "get",
          path: "/foo",
          args: [],
          operationFragment: {},
          expressMiddleware: [methodMiddleware],
        },
        {
          type: "custom",
          expressMiddleware: [controllerMiddleware],
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
                expressMiddleware: [controllerMiddleware, methodMiddleware],
              },
            },
          },
        },
      });
    });
  });

  describe("handler middleware", function () {
    it("configures controller middleware", function () {
      const operationId = "foobar";
      const middleware = (
        ctx: OperationHandlerMiddlewareContext,
        next: OperationHandlerMiddlewareNextFunction
      ) => {};

      const [result] = invoke(
        {
          method: "get",
          path: "/foo",
          args: [],
          operationFragment: {},
        },
        {
          type: "custom",
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
          method: "get",
          path: "/foo",
          args: [],
          operationFragment: {},
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
          method: "get",
          path: "/foo",
          args: [],
          operationFragment: {},
          handlerMiddleware: [methodMiddleware],
        },
        {
          type: "custom",
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
