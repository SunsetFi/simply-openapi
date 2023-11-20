import { OpenAPIObject } from "openapi3-ts/oas31";
import { Router } from "express";

import { Controller, Get, JsonResponse } from "../decorators";
import { createOpenAPIFromControllers } from "../openapi";
import { createRouterFromSpec } from "../routes";

import { tapPromise, trackPromise } from "./tracked-promise";
import { getMockReq, getMockRes } from "./mocks";

describe("E2E: Async Get", function () {
  @Controller("/")
  class WidgetController {
    @Get("/")
    @JsonResponse(200, {
      type: "object",
      properties: { bar: { type: "boolean" } },
    })
    async getFooController() {
      return trackPromise(() => delay(100).then(() => ({ bar: true })));
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
});

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
