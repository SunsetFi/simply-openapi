import { OpenAPIObject } from "openapi3-ts/oas31";
import { SOCControllerMethodExtensionName } from "./extensions";
import { stripSOCExtensions } from "./strip-soc";

describe("stripSOCExtensions", function () {
  it("removes the extension from an object", function () {
    expect(
      stripSOCExtensions({ [SOCControllerMethodExtensionName]: true } as any),
    ).toEqual({});
  });

  it("removes the extension from an object in an array", function () {
    expect(
      stripSOCExtensions([{ [SOCControllerMethodExtensionName]: true }] as any),
    ).toEqual([{}]);
  });

  it("removes the extension from a nested object", function () {
    expect(
      stripSOCExtensions({
        foo: { [SOCControllerMethodExtensionName]: true },
      } as any),
    ).toEqual({ foo: {} });
  });

  it("preserves other values", function () {
    const spec: OpenAPIObject = {
      openapi: "3.1.0",
      info: {
        title: "Test",
        version: "1.0.0",
      },
      paths: {
        "/": {
          get: {
            responses: {
              200: {
                description: "OK",
              },
            },
          },
        },
      },
    };

    expect(stripSOCExtensions(spec)).toMatchObject(spec);
  });
});
