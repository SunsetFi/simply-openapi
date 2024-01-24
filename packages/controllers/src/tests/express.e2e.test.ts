import { OpenAPIObject } from "openapi3-ts/oas31";
import { NextFunction, Request, Response, Router } from "express";
import { ImATeapot } from "http-errors";

import { Controller, Get, Req, Res, UseHandlerMiddleware } from "../decorators";
import { createOpenAPIFromControllers } from "../openapi";

import { createRouterFromSpec } from "../routes";
import { getMockReq, getMockRes } from "./mocks";
import { convertExpressMiddleware } from "../handlers";
import { expectNextCalledWithError } from "./expects";

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

    @Get("/throws-middleware")
    @UseHandlerMiddleware(
      convertExpressMiddleware(
        (req: Request, res: Response, next: NextFunction) => {
          throw new ImATeapot("Oh no!");
        },
      ),
    )
    throwsRequest() {
      return {};
    }

    @Get("/throws-through-middleware")
    @UseHandlerMiddleware(
      convertExpressMiddleware(
        (req: Request, res: Response, next: NextFunction) => {
          next();
        },
      ),
    )
    throwsThroughMiddleware() {
      throw new ImATeapot("Oh no!");
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

  it("captures errors thrown from express middleware", function (done) {
    const req = getMockReq("GET", "/throws-middleware");
    const { res, next } = getMockRes();

    router(req, res, next);

    // Even with sync functions, we await promises, which trampolines us out
    setTimeout(() => {
      try {
        expectNextCalledWithError(next, ImATeapot, /Oh no!/);

        done();
      } catch (e) {
        done(e);
      }
    }, 10);
  });

  it("captures errors that propogate through express middleware", function (done) {
    const req = getMockReq("GET", "/throws-through-middleware");
    const { res, next } = getMockRes();

    router(req, res, next);

    // Even with sync functions, we await promises, which trampolines us out
    setTimeout(() => {
      try {
        expectNextCalledWithError(next, ImATeapot, /Oh no!/);

        done();
      } catch (e) {
        done(e);
      }
    }, 10);
  });
});
