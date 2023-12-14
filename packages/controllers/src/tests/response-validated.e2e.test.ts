import { OpenAPIObject } from "openapi3-ts/oas31";
import { Router } from "express";
import { InternalServerError } from "http-errors";

import { Controller, Get, Response } from "../decorators";
import { createOpenAPIFromControllers } from "../openapi";
import { createRouterFromSpec } from "../routes";
import { HandlerResult } from "../handlers";

import { getMockReq, getMockRes } from "./mocks";
import { expectNextCalledWithError } from "./expects";

describe("E2E: Response validation", function () {
  const handler = jest.fn();

  @Controller("/")
  class WidgetController {
    @Get("/response-test")
    @Response(200, {
      "application/json": {
        schema: {
          type: "object",
          properties: { expectedField: { type: "boolean" } },
          required: ["expectedField"],
        },
      },
      "application/foo+json": {
        schema: {
          type: "object",
          properties: { expectedField: { type: "integer" } },
          required: ["expectedField"],
        },
      },
    })
    handleBadResponse() {
      // Intentionally returning data that does not match the schema
      return handler();
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

  beforeEach(() => {
    handler.mockReset();
  });

  it("generates the appropriate OpenAPI schema", function () {
    expect(spec).toMatchObject({
      paths: {
        "/response-test": {
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
                  "application/foo+json": {
                    schema: {
                      type: "object",
                      properties: { expectedField: { type: "integer" } },
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

  it("accepts a valid json responses", function (done) {
    const req = getMockReq("GET", "/response-test");
    const { res, next } = getMockRes();

    handler.mockImplementation(() => ({ expectedField: true }));

    router(req, res, next);

    setTimeout(() => {
      try {
        expect(next).not.toHaveBeenCalled();
        done();
      } catch (e) {
        done(e);
      }
    }, 100);
  });

  it("throws InternalServerError for non-schema-compliant JSON response", function (done) {
    const req = getMockReq("GET", "/response-test");
    const { res, next } = getMockRes();

    handler.mockImplementation(() => ({ expectedField: "not a boolean" }));

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

  it("accepts a valid HandlerResult response", function (done) {
    const req = getMockReq("GET", "/response-test");
    const { res, next } = getMockRes();

    handler.mockImplementation(() =>
      HandlerResult.json({ expectedField: true }),
    );

    router(req, res, next);

    setTimeout(() => {
      try {
        expect(next).not.toHaveBeenCalled();
        done();
      } catch (e) {
        done(e);
      }
    }, 100);
  });

  it("throws InternalServerError for non-schema-compliant HandlerResult response", function (done) {
    const req = getMockReq("GET", "/response-test");
    const { res, next } = getMockRes();

    handler.mockImplementation(() => HandlerResult.json({ expectedField: 42 }));

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

  it("accepts a valid response based on content type", function (done) {
    const req = getMockReq("GET", "/response-test");
    const { res, next } = getMockRes();

    handler.mockImplementation(() =>
      HandlerResult.json({ expectedField: 42 }).header(
        "Content-Type",
        "application/foo+json",
      ),
    );

    router(req, res, next);

    setTimeout(() => {
      try {
        expect(next).not.toHaveBeenCalled();
        done();
      } catch (e) {
        done(e);
      }
    }, 100);
  });

  it("Throws InternalServerError for the matching the content type", function (done) {
    const req = getMockReq("GET", "/response-test");
    const { res, next } = getMockRes();

    handler.mockImplementation(() =>
      HandlerResult.json({ expectedField: false }).header(
        "Content-Type",
        "application/foo+json",
      ),
    );

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

  test.todo("Calls the error handler function when provided");
  test.todo("Enforces documentation in required mode");
});
