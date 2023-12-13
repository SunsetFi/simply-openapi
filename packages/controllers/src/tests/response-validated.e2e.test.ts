import { OpenAPIObject } from "openapi3-ts/oas31";
import { Router } from "express";
import { InternalServerError } from "http-errors";

import { Controller, Get, JsonResponse } from "../decorators";
import { createOpenAPIFromControllers } from "../openapi";
import { createRouterFromSpec } from "../routes";

import { getMockReq, getMockRes } from "./mocks";
import { expectNextCalledWithError } from "./expects";

describe("E2E: Response validation", function () {
  @Controller("/")
  class WidgetController {
    @Get("/bad-response")
    @JsonResponse(200, {
      type: "object",
      properties: { expectedField: { type: "boolean" } },
      required: ["expectedField"],
    })
    handleBadResponse() {
      // Intentionally returning data that does not match the schema
      return { expectedField: 400 };
    }
  }

  let spec: OpenAPIObject;
  let router: Router;
  beforeAll(() => {
    spec = createOpenAPIFromControllers({ title: "Test", version: "1.0.0" }, [
      new WidgetController(),
    ]);
    router = createRouterFromSpec(spec, { responseValidation: true });
  });

  it("generates the appropriate OpenAPI schema", function () {
    expect(spec).toMatchObject({
      paths: {
        "/bad-response": {
          get: {
            responses: {
              200: {
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: { expectedField: { type: "boolean" } },
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

  test.todo("lets through valid json responses");

  it("throws InternalServerError for non-schema-compliant JSON response", function (done) {
    const req = getMockReq("GET", "/bad-response");
    const { res, next } = getMockRes();

    router(req, res, next);

    setTimeout(() => {
      try {
        expectNextCalledWithError(
          next,
          InternalServerError,
          /The server returned an invalid response according to the OpenAPI schema/,
        );

        done();
      } catch (e) {
        done(e);
      }
    }, 100);
  });

  test.todo("lets through valid HandlerResult response");
  test.todo(
    "throws InternalServerError for non-schema-compliant HandlerResult response",
  );

  test.todo(
    "Throws InternalServerError for the matching status code and content type",
  );

  test.todo("Calls the error handler function when provided");
  test.todo("Enforces documentation in required mode");
});
