import { OpenAPIObject, PathsObject } from "openapi3-ts/oas31";
import { Router } from "express";
import { BadRequest } from "http-errors";
import "jest-extended";

import {
  Controller,
  Get,
  HeaderParam,
  JsonResponse,
  RequiredHeaderParam,
} from "../decorators";
import { createOpenAPIFromControllers } from "../openapi";
import { createRouterFromSpec } from "../routes";

import { getMockReq, getMockRes } from "./mocks";
import { expectNextCalledWithError } from "./expects";

describe("E2E: Header Param", function () {
  const handler = jest.fn();

  beforeEach(() => {
    handler.mockReset();
  });

  @Controller("/")
  class WidgetController {
    @Get("/opt")
    @JsonResponse(200, {
      type: "object",
      properties: { bar: { type: "boolean" } },
    })
    getOptionalParam(
      @HeaderParam("foo", "integer", { description: "The foo parameter" })
      foo: number,
    ) {
      handler(foo);
      return { bar: true };
    }

    @Get("/req")
    @JsonResponse(200, {
      type: "object",
      properties: { bar: { type: "boolean" } },
    })
    getRequiredParam(
      @RequiredHeaderParam("foo", "integer", {
        description: "The foo parameter",
      })
      foo: number,
    ) {
      handler(foo);
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
        "/opt": {
          get: {
            parameters: [
              {
                name: "foo",
                in: "header",
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
        "/req": {
          get: {
            parameters: [
              {
                name: "foo",
                in: "header",
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

  describe("optional", function () {
    it("sets the param", function (done) {
      const req = getMockReq("GET", "/opt?foo=123", {
        headers: { foo: "123" },
      });
      const { res, next } = getMockRes();

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expect(next).not.toHaveBeenCalled();

          expect(handler).toHaveBeenCalledWith(123);

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });

    it("returns undefined for an unpassed param", function (done) {
      const req = getMockReq("GET", "/opt", {
        headers: {},
      });
      const { res, next } = getMockRes();

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expect(next).not.toHaveBeenCalled();

          expect(handler).toHaveBeenCalledWith(undefined);

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });

    it("returns bad request for an invalid param", function (done) {
      const req = getMockReq("GET", "/opt?foo=123", {
        headers: { foo: "aaa" },
      });
      const { res, next } = getMockRes();

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expectNextCalledWithError(
            next,
            BadRequest,
            /Header parameter "foo" is invalid: value must be integer/,
          );

          expect(handler).not.toHaveBeenCalled();

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });
  });

  describe("required", function () {
    it("sets the param", function (done) {
      const req = getMockReq("GET", "/req", {
        headers: { foo: "12" },
      });
      const { res, next } = getMockRes();

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expect(next).not.toHaveBeenCalled();

          expect(handler).toHaveBeenCalledWith(12);

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });

    it("returns bad request for an unpassed param", function (done) {
      const req = getMockReq("GET", "/req", {
        headers: {},
      });
      const { res, next } = getMockRes();

      router(req, res, next);

      // Even with sync functions, we await promises, which trampolines us out
      setTimeout(() => {
        try {
          expectNextCalledWithError(
            next,
            BadRequest,
            /Header parameter "foo" is required./,
          );

          expect(handler).not.toHaveBeenCalled();

          done();
        } catch (e) {
          done(e);
        }
      }, 10);
    });
  });
});
