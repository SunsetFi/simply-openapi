import { OpenAPIObject, OperationObject } from "openapi3-ts/oas31";
import { merge } from "lodash";
import { Request, Response, NextFunction } from "express";
import { PartialDeep } from "type-fest";
import "jest-extended";

import {
  SOCControllerMetadata,
  SOCControllerMethodMetadata,
  setSOCControllerMetadata,
  setSOCControllerMethodMetadata,
} from "../../metadata";

import { SOCControllerMethodExtensionName } from "../extensions";
import {
  OperationRequestContext,
  OperationMiddlewareNextFunction,
} from "../../handlers";

import { extractSOCCustomMethodSpec } from "./custom-method";

describe("extractSOCCustomMethodSpec", function () {
  function createTestInstance(
    methodMetadata: SOCControllerMethodMetadata | null,
    controllerMetadata: SOCControllerMetadata | null,
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
    input: PartialDeep<OpenAPIObject> | null = null,
  ): [
    result: PartialDeep<OpenAPIObject> | undefined,
    controller: object,
    methodName: string | symbol,
  ] {
    const finalInput = merge(
      {
        openapi: "3.1.0",
        info: {
          title: "Test",
          version: "1.0.0",
        },
      },
      input ?? {},
    ) as OpenAPIObject;

    const [controller, methodName] = createTestInstance(
      metadata,
      controllerMetadata,
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
      handlerArgs: [],
    };

    expect(invoke(metadata)[0]).toBeUndefined();
  });

  it("throws if a custom method is present on a bound controller", function () {
    const test = () =>
      invoke(
        {
          method: "get",
          path: "/foo",
          handlerArgs: [],
          operationFragment: {},
        },
        {
          type: "bound",
        },
      );

    expect(test).toThrowWithMessage(Error, /is a bound controller/);
  });

  it("creates the extension for a custom method", function () {
    const path = "/foo";
    const method = "get";

    const [result, controller, methodName] = invoke({
      method,
      path,
      handlerArgs: [],
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
      handlerArgs: [],
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
          handlerArgs: [],
          operationFragment,
        },
        {
          type: "custom",
          sharedOperationFragment: {
            tags,
          },
        },
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
          handlerArgs: [],
          operationFragment,
        },
        {
          type: "custom",
          sharedOperationFragment: {
            tags: controllerTags,
          },
        },
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

  describe("handler middleware", function () {
    it("configures controller middleware", function () {
      const operationId = "foobar";
      const middleware = (
        ctx: OperationRequestContext,
        next: OperationMiddlewareNextFunction,
      ) => {};

      const [result] = invoke(
        {
          method: "get",
          path: "/foo",
          handlerArgs: [],
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
        },
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
        ctx: OperationRequestContext,
        next: OperationMiddlewareNextFunction,
      ) => {};

      const [result] = invoke(
        {
          method: "get",
          path: "/foo",
          handlerArgs: [],
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
        },
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
        ctx: OperationRequestContext,
        next: OperationMiddlewareNextFunction,
      ) => {};
      const methodMiddleware = (
        ctx: OperationRequestContext,
        next: OperationMiddlewareNextFunction,
      ) => {};

      const [result] = invoke(
        {
          method: "get",
          path: "/foo",
          handlerArgs: [],
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
        },
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
