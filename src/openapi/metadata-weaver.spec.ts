import { OpenAPIObject } from "openapi3-ts/oas31";
import "jest-extended";

import { setSOCControllerMethodMetadata } from "../metadata";

import { createOpenAPIFromControllers } from "./metadata-weaver";

describe("createOpenAPIFromControllers", function () {
  it("creates the base openapi specification", function () {
    const result = createOpenAPIFromControllers(
      {
        title: "Test",
        version: "1.0.0",
      },
      [],
      {}
    );

    expect(result).toMatchObject({
      openapi: "3.0.0",
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
        {}
      )
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
        args: [],
        operationFragment: {},
      },
      methodName
    );

    const result = createOpenAPIFromControllers(
      {
        title: "Test",
        version: "1.0.0",
      },
      [controller],
      {}
    );

    expect(result).toMatchObject({
      paths: {
        [path]: {
          [method]: expect.toBeObject(),
        },
      },
    });
  });

  describe("operationSpecExtractors", function () {
    it("calls custom operationSpecExtractors", function () {
      const methodName = "testMethod";
      const controller = {
        [methodName]: function () {},
      };

      const extractor = jest.fn(() => ({}));

      createOpenAPIFromControllers(
        {
          title: "Test",
          version: "1.0.0",
        },
        [controller],
        {
          operationSpecExtractors: [extractor],
        }
      );

      expect(extractor).toHaveBeenCalledWith(controller, methodName);
    });

    it("runs operationSpecExtractors after the built in extractor", function () {
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
          args: [],
          operationFragment: {},
        },
        methodName
      );

      const replacer = jest.fn((value: OpenAPIObject) => value);
      const extractor = jest.fn(() => replacer);

      createOpenAPIFromControllers(
        {
          title: "Test",
          version: "1.0.0",
        },
        [controller],
        {
          operationSpecExtractors: [extractor],
        }
      );

      expect(replacer).toHaveBeenCalledWith(
        expect.objectContaining({
          paths: {
            [path]: {
              [method]: expect.toBeObject(),
            },
          },
        })
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
          args: [],
          operationFragment: {},
        },
        methodName
      );

      const extractorResult = { "x-test": true };
      const extractor = () => extractorResult;

      const result = createOpenAPIFromControllers(
        {
          title: "Test",
          version: "1.0.0",
        },
        [controller],
        {
          operationSpecExtractors: [extractor],
        }
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
          args: [],
          operationFragment: {},
        },
        methodName
      );

      const replacedSpec: OpenAPIObject = {
        openapi: "3.0.0",
        info: { title: "Replaced", version: "1.0.0" },
        paths: {},
        "x-test": true,
      };
      const extractorResult = (spec: OpenAPIObject) => replacedSpec;
      const extractor = () => extractorResult;

      const result = createOpenAPIFromControllers(
        {
          title: "Test",
          version: "1.0.0",
        },
        [controller],
        {
          operationSpecExtractors: [extractor],
        }
      );

      expect(result).toEqual(replacedSpec);
    });
  });
});
