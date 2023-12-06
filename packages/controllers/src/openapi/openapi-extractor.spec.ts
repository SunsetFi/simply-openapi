import { OpenAPIObject } from "openapi3-ts/oas31";
import "jest-extended";

import { setSOCControllerMethodMetadata } from "../metadata";

import { createOpenAPIFromControllers } from "./openapi-extractor";
import { ControllerObject } from "../types";

describe("createOpenAPIFromControllers", function () {
  it("creates the base openapi specification", function () {
    const result = createOpenAPIFromControllers(
      {
        title: "Test",
        version: "1.0.0",
      },
      [],
      {},
    );

    expect(result).toMatchObject({
      openapi: "3.1.0",
      info: {
        title: "Test",
        version: "1.0.0",
      },
      paths: {},
    });
  });

  it("throws if a controller does not specify any SOC methods", function () {
    const controller = {
      testMethod() {},
    };

    expect(() =>
      createOpenAPIFromControllers(
        {
          title: "Test",
          version: "1.0.0",
        },
        [controller],
        {},
      ),
    ).toThrowWithMessage(Error, /has no SOC-decorated methods/);
  });

  it("supports custom operation specifications", function () {
    const methodName = "testMethod";
    const controller = {
      [methodName]: function () {},
    };

    const method = "get";
    const path = "/foo";

    setSOCControllerMethodMetadata(
      controller,
      {
        method,
        path,
        handlerArgs: [],
        operationFragment: {},
      },
      methodName,
    );

    const result = createOpenAPIFromControllers(
      {
        title: "Test",
        version: "1.0.0",
      },
      [controller],
      {},
    );

    expect(result).toMatchObject({
      paths: {
        [path]: {
          [method]: expect.toBeObject(),
        },
      },
    });
  });

  describe("controllerSpecExtractors", function () {
    it("calls custom method controllerSpecExtractors", function () {
      const methodName = "testMethod";
      const controller = {
        [methodName]: function () {},
      };

      const extractor = jest.fn(
        (controller: ControllerObject, methodName: string | symbol) => ({}),
      );

      createOpenAPIFromControllers(
        {
          title: "Test",
          version: "1.0.0",
        },
        [controller],
        {
          controllerSpecExtractors: [extractor],
        },
      );

      expect(extractor).toHaveBeenCalledWith(controller, methodName);
    });

    it("calls custom controller controllerSpecExtractors", function () {
      const methodName = "testMethod";
      const controller = {
        [methodName]: function () {},
      };

      const extractor = jest.fn((controller: ControllerObject) => ({}));

      createOpenAPIFromControllers(
        {
          title: "Test",
          version: "1.0.0",
        },
        [controller],
        {
          controllerSpecExtractors: [extractor],
        },
      );

      expect(extractor).toHaveBeenCalledWith(controller);
    });

    it("calls custom controller method extractors after controller extractors", function () {
      const methodName = "testMethod";
      const controller = {
        [methodName]: function () {},
      };

      const controllerExtractor = jest.fn((controller) => ({}));
      const controllerMethodExtractor = jest.fn((controller, method) => ({}));

      createOpenAPIFromControllers(
        {
          title: "Test",
          version: "1.0.0",
        },
        [controller],
        {
          controllerSpecExtractors: [
            controllerMethodExtractor,
            controllerExtractor,
          ],
        },
      );

      expect(controllerExtractor).toHaveBeenCalled();
      expect(controllerMethodExtractor).toHaveBeenCalled();

      expect(controllerExtractor).toHaveBeenCalledBefore(
        controllerMethodExtractor,
      );
    });

    it("runs controllerSpecExtractors after the built in extractor", function () {
      const methodName = "testMethod";
      const controller = {
        [methodName]: function () {},
      };

      const method = "get";
      const path = "/foo";

      setSOCControllerMethodMetadata(
        controller,
        {
          method,
          path,
          handlerArgs: [],
          operationFragment: {},
        },
        methodName,
      );

      const replacer = jest.fn((value: OpenAPIObject) => value);
      const extractor = jest.fn(
        (controller: ControllerObject, methodName: string | symbol) => replacer,
      );

      createOpenAPIFromControllers(
        {
          title: "Test",
          version: "1.0.0",
        },
        [controller],
        {
          controllerSpecExtractors: [extractor],
        },
      );

      expect(replacer).toHaveBeenCalledWith(
        expect.objectContaining({
          paths: {
            [path]: {
              [method]: expect.toBeObject(),
            },
          },
        }),
      );
    });

    it("merges returned extractor objects", function () {
      const methodName = "testMethod";
      const controller = {
        [methodName]: function () {},
      };

      const method = "get";
      const path = "/foo";

      setSOCControllerMethodMetadata(
        controller,
        {
          method,
          path,
          handlerArgs: [],
          operationFragment: {},
        },
        methodName,
      );

      const extractorResult = { "x-test": true };
      const extractor = (
        controller: ControllerObject,
        methodName: string | symbol,
      ) => extractorResult;

      const result = createOpenAPIFromControllers(
        {
          title: "Test",
          version: "1.0.0",
        },
        [controller],
        {
          controllerSpecExtractors: [extractor],
        },
      );

      expect(result).toMatchObject({
        paths: {
          [path]: {
            [method]: expect.toBeObject(),
          },
        },
        ...extractorResult,
      });
    });

    it("invokes replacement functions returned by extractor objects", function () {
      const methodName = "testMethod";
      const controller = {
        [methodName]: function () {},
      };

      const method = "get";
      const path = "/foo";

      setSOCControllerMethodMetadata(
        controller,
        {
          method,
          path,
          handlerArgs: [],
          operationFragment: {},
        },
        methodName,
      );

      const replacedSpec: OpenAPIObject = {
        openapi: "3.1.0",
        info: { title: "Replaced", version: "1.0.0" },
        "x-test": true,
      };
      const extractorResult = (spec: OpenAPIObject) => replacedSpec;
      const extractor = (
        controller: ControllerObject,
        methodName: string | symbol,
      ) => extractorResult;

      const result = createOpenAPIFromControllers(
        {
          title: "Test",
          version: "1.0.0",
        },
        [controller],
        {
          controllerSpecExtractors: [extractor],
        },
      );

      expect(result).toEqual(replacedSpec);
    });
  });
});
