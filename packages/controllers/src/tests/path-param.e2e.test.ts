import { OpenAPIObject, PathsObject } from "openapi3-ts/oas31";
import { Router } from "express";
import { NotFound } from "http-errors";

import { Controller, Get, JsonResponse, PathParam } from "../decorators";
import { createOpenAPIFromControllers } from "../openapi";
import { createRouterFromSpec } from "../routes";

import { getMockReq, getMockRes } from "./mocks";

describe("E2E: Path Param", function () {
  const openApiHandler = jest.fn();
  const expressHandler = jest.fn();

  beforeEach(() => {
    openApiHandler.mockReset();
    expressHandler.mockReset();
  });

  @Controller("/")
  class WidgetController {
    @Get("/openapi/{foo}", { tags: ["Get Foo", "OpenAPI"] })
    @JsonResponse(200, {
      type: "object",
      properties: { bar: { type: "boolean" } },
    })
    getOpenAPIStyle(
      @PathParam("foo", "integer", { description: "The foo parameter" })
      foo: number,
    ) {
      openApiHandler(foo);
      return { bar: true };
    }

    @Get("/express/:foo", { tags: ["Get Foo", "Express"] })
    @JsonResponse(200, {
      type: "object",
      properties: { bar: { type: "boolean" } },
    })
    getExpressStyle(
      @PathParam("foo", "integer", { description: "The foo parameter" })
      foo: number,
    ) {
      expressHandler(foo);
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
        "/openapi/{foo}": {
          get: {
            tags: ["Get Foo", "OpenAPI"],
            parameters: [
              {
                name: "foo",
                in: "path",
                required: true,
                schema: { type: "integer" },
                description: "The foo parameter",
              },
            ],
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
        "/express/{foo}": {
          get: {
            tags: ["Get Foo", "Express"],
            parameters: [
              {
                name: "foo",
                in: "path",
                required: true,
                schema: { type: "integer" },
                description: "The foo parameter",
              },
            ],
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
      } satisfies PathsObject,
    });
  });

  describe("openapi param", function () {
    it("sets the param", function (done) {
      const req = getMockReq("GET", "/openapi/123");
      const { res, next } = getMockRes();

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expect(next).not.toHaveBeenCalled();

          expect(openApiHandler).toHaveBeenCalledWith(123);

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });

    it("returns not found for an invalid param", function (done) {
      const req = getMockReq("GET", "/openapi/aaa");
      const { res, next } = getMockRes();

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expect(next).toHaveBeenCalledWith(expect.any(NotFound));

          expect(openApiHandler).not.toHaveBeenCalled();

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });
  });

  describe("express param", function () {
    it("sets the param", function (done) {
      const req = getMockReq("GET", "/express/123");
      const { res, next } = getMockRes();

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expect(next).not.toHaveBeenCalled();

          expect(expressHandler).toHaveBeenCalledWith(123);

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });

    it("returns not found for an invalid param", function (done) {
      const req = getMockReq("GET", "/express/aaa");
      const { res, next } = getMockRes();

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expect(next).toHaveBeenCalledWith(expect.any(NotFound));

          expect(expressHandler).not.toHaveBeenCalled();

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });
  });
});
