import { OpenAPIObject } from "openapi3-ts/oas31";
import "jest-extended";

import {
  SOCControllerMethodExtensionData,
  SOCControllerMethodExtensionName,
} from "../../openapi";
import { createOpenAPIAjv } from "../../ajv";

jest.mock("./MethodHandler", () => {
  return {
    MethodHandler: jest.fn().mockImplementation(() => {
      return {
        handle: jest.fn(),
      };
    }),
  };
});

import { createMethodHandlerFromSpec } from "./handler-from-spec";
import { MethodHandler } from "./MethodHandler";

const ajv = createOpenAPIAjv();

describe("createMethodHandlerFromSpec", function () {
  describe("createFromSpec", function () {
    test.todo("creates data processors");

    describe("controller resolution", function () {
      it("uses the controller resolver specified in resolveController", async function () {
        const inputController = "input";
        const handler = jest.fn(() => undefined);
        const outputController = {
          handler,
        };
        const resolver = jest.fn(() => outputController);

        const spec: OpenAPIObject = {
          openapi: "3.1.0",
          info: { title: "Test", version: "1.0.0" },
          paths: {
            path: {
              get: {
                responses: {},
                [SOCControllerMethodExtensionName]: {
                  controller: inputController,
                  handler: "handler",
                  handlerArgs: [],
                } satisfies SOCControllerMethodExtensionData,
              },
            },
          },
        };

        createMethodHandlerFromSpec(spec, "path", "get", ajv, {
          resolveController: resolver,
        });

        expect(resolver).toHaveBeenCalledWith(
          inputController,
          expect.objectContaining({
            spec,
            path: "path",
            method: "get",
            pathItem: spec.paths!.path,
            operation: spec.paths!.path.get,
          }),
        );

        expect(MethodHandler).toHaveBeenCalledWith(
          outputController,
          handler,
          expect.any(Array),
          expect.any(Array),
          expect.any(Object),
          expect.any(Object),
        );
      });
    });

    describe("handler resolution", function () {
      it("resolves a handler from a string", async function () {
        const methodName = "testHandler";
        const handler = jest.fn(() => undefined);
        const inputController = {
          [methodName]: handler,
        };

        const spec: OpenAPIObject = {
          openapi: "3.1.0",
          info: { title: "Test", version: "1.0.0" },
          paths: {
            path: {
              get: {
                responses: {},
                [SOCControllerMethodExtensionName]: {
                  controller: inputController,
                  handler: methodName,
                  handlerArgs: [],
                } satisfies SOCControllerMethodExtensionData,
              },
            },
          },
        };

        createMethodHandlerFromSpec(spec, "path", "get", ajv, {});

        expect(MethodHandler).toHaveBeenCalledWith(
          inputController,
          handler,
          expect.any(Array),
          expect.any(Array),
          expect.any(Object),
          expect.any(Object),
        );
      });

      it("uses the handler resolver supplied by resolveHandler", async function () {
        const methodName = "testHandler";
        const handler = jest.fn(() => undefined);
        const resolver = jest.fn(() => handler);
        const inputController = {};

        const spec: OpenAPIObject = {
          openapi: "3.1.0",
          info: { title: "Test", version: "1.0.0" },
          paths: {
            path: {
              get: {
                responses: {},
                [SOCControllerMethodExtensionName]: {
                  controller: inputController,
                  handler: methodName,
                  handlerArgs: [],
                } satisfies SOCControllerMethodExtensionData,
              },
            },
          },
        };
        createMethodHandlerFromSpec(spec, "path", "get", ajv, {
          resolveHandler: resolver,
        });

        expect(resolver).toHaveBeenCalledWith(
          inputController,
          methodName,
          expect.objectContaining({
            spec,
            path: "path",
            method: "get",
            pathItem: spec.paths!.path,
            operation: spec.paths!.path.get,
          }),
        );

        expect(MethodHandler).toHaveBeenCalledWith(
          inputController,
          handler,
          expect.any(Array),
          expect.any(Array),
          expect.any(Object),
          expect.any(Object),
        );
      });
    });

    test.todo("handler middleware is concatenated in the correct order");
    test.todo("express pre middleware is concatenated in the correct order");
    test.todo("express post middleware is concatenated in the correct order");
  });
});
