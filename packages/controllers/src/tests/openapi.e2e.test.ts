import { OpenAPIObject } from "openapi3-ts/oas31";
import { Router } from "express";

import { Controller, Get, OpenAPI } from "../decorators";
import { createOpenAPIFromControllers } from "../openapi";
import { createRouterFromSpec } from "../routes";

describe("E2E: OpenAPI", function () {
  @Controller("/")
  @OpenAPI({
    components: {
      parameters: {
        foo: {
          name: "foo",
          in: "query",
          description: "Foo parameter",
        },
      },
    },
  })
  class WidgetController {
    @Get("/")
    @OpenAPI({
      components: {
        parameters: {
          bar: {
            name: "bar",
            in: "query",
            description: "Bar parameter",
          },
        },
      },
    })
    handleRequest() {
      return { bar: true };
    }
  }

  let spec: OpenAPIObject;
  let router: Router;
  beforeAll(() => {
    spec = createOpenAPIFromControllers({ title: "Test", version: "1.0.0" }, [
      new WidgetController(),
    ]);
    router = createRouterFromSpec(spec);
  });

  it("generates the appropriate OpenAPI schema", function () {
    expect(spec).toMatchObject({
      components: {
        parameters: {
          foo: {
            name: "foo",
            in: "query",
            description: "Foo parameter",
          },
          bar: {
            name: "bar",
            in: "query",
            description: "Bar parameter",
          },
        },
      },
    });
  });
});
