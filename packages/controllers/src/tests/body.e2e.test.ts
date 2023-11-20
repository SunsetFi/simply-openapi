import { OpenAPIObject } from "openapi3-ts/oas31";
import { Router } from "express";

import { Controller, Get, JsonResponse } from "../decorators";
import { createOpenAPIFromControllers } from "../openapi";
import { createRouterFromSpec } from "../routes";
import { getMockReq, getMockRes } from "./mocks";

describe("E2E: Body", function () {
  @Controller("/")
  class WidgetController {
    @Get("/")
    @JsonResponse(200, {
      type: "object",
      properties: { bar: { type: "boolean" } },
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
      paths: {
        "/": {
          get: {
            responses: {
              200: {
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: { bar: { type: "boolean" } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  it("sends the response", function (done) {
    const req = getMockReq("GET", "/");
    const { res, next } = getMockRes();

    router(req, res, next);

    // Even with sync functions, we await promises, which trampolines us out
    setTimeout(() => {
      try {
        expect(next).not.toHaveBeenCalled();

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.setHeader).toHaveBeenCalledWith(
          "Content-Type",
          "application/json",
        );
        expect(res.json).toHaveBeenCalledWith({ bar: true });

        done();
      } catch (e) {
        done(e);
      }
    }, 10);
  });
});
