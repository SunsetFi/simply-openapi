import { OpenAPIObject } from "openapi3-ts/oas31";
import { Request, Response, Router } from "express";

import { Controller, Get, Req, Res } from "../decorators";
import { createOpenAPIFromControllers } from "../openapi";

import { createRouterFromSpec } from "../routes";
import { getMockReq, getMockRes } from "./mocks";

describe("E2E: Express decorators", function () {
  var handler = jest.fn();

  beforeEach(() => {
    handler.mockReset();
  });

  @Controller("/")
  class WidgetController {
    @Get("/")
    handleRequest(@Req() req: Request, @Res() res: Response) {
      handler(req, res);

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

  it("gets the express objects", function (done) {
    const req = getMockReq("GET", "/");
    const { res, next } = getMockRes();

    router(req, res, next);

    // Even with sync functions, we await promises, which trampolines us out
    setTimeout(() => {
      try {
        expect(next).not.toHaveBeenCalled();

        expect(handler).toHaveBeenCalledWith(req, res);

        done();
      } catch (e) {
        done(e);
      }
    }, 10);
  });
});
