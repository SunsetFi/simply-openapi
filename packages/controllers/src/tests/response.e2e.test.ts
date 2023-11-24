import { OpenAPIObject } from "openapi3-ts/oas31";
import { Router } from "express";

import {
  Controller,
  EmptyResponse,
  Get,
  JsonResponse,
  Response,
} from "../decorators";
import { createOpenAPIFromControllers } from "../openapi";
import { HandlerResult } from "../handlers";
import { createRouterFromSpec } from "../routes";

import { getMockReq, getMockRes } from "./mocks";
import { tapPromise, trackPromise } from "./tracked-promise";

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

    @Get("/async")
    @JsonResponse(200, {
      type: "object",
      properties: { bar: { type: "boolean" } },
    })
    async getFooController() {
      return trackPromise(() => delay(100).then(() => ({ bar: true })));
    }

    @Get("/custom")
    @Response(200, {
      "foo/bar": {
        schema: {
          type: "integer",
        },
      },
    })
    handleCustomRequest() {
      return 42;
    }

    @Get("/empty")
    @EmptyResponse(201)
    handleEmptyRequest() {
      return HandlerResult.status(201);
    }

    @Get("/handler-response")
    handlerResponseRequest() {
      return HandlerResult.status(201)
        .header("foo", "bar")
        .json({ foo: "bar" });
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
        "/async": {
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
        "/custom": {
          get: {
            responses: {
              200: {
                content: {
                  "foo/bar": {
                    schema: {
                      type: "integer",
                    },
                  },
                },
              },
            },
          },
        },
        "/empty": {
          get: {
            responses: {
              201: {},
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

  it("sends the async response", function (done) {
    const req = getMockReq("GET", "/async");
    const { res, next } = getMockRes();

    router(req, res, next);

    tapPromise(() => {
      //  Yes we wait on the promise, but there are other cascading promise resolutions before this is settled,
      // and all of those trampoline out
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

  it("handles HandlerResult responses", function (done) {
    const req = getMockReq("GET", "/handler-response");
    const { res, next } = getMockRes();

    router(req, res, next);

    // Even with sync functions, we await promises, which trampolines us out
    setTimeout(() => {
      try {
        expect(next).not.toHaveBeenCalled();

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.setHeader).toHaveBeenCalledWith("foo", "bar");
        expect(res.setHeader).toHaveBeenCalledWith(
          "Content-Type",
          "application/json",
        );
        expect(res.json).toHaveBeenCalledWith({ foo: "bar" });

        done();
      } catch (e) {
        done(e);
      }
    }, 10);
  });
});

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
