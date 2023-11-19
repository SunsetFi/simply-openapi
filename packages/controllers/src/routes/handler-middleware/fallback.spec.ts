import { getMockReq, getMockRes } from "@jest-mock/express";
import "jest-extended";

import { operationHandlerFallbackResponseMiddleware } from "./fallback";

describe("operationHandlerFallbackResponseMiddleware", function () {
  it("errors when no response has been sent", async function () {
    const test = async () => {
      await operationHandlerFallbackResponseMiddleware(
        {
          spec: { openapi: "3.1.0", info: { title: "Test", version: "1.0.0" } },
          path: "/",
          controller: {},
          method: "GET",
          pathItem: {} as any,
          handler: () => {},
          operation: {} as any,
          req: getMockReq(),
          res: getMockRes().res,
        },
        jest.fn(() => undefined) as any,
      );
    };

    await expect(test()).rejects.toThrowWithMessage(
      Error,
      /did not send a response for the handler result/,
    );
  });

  it("errors when a result is not handled", async function () {
    const test = async () => {
      await operationHandlerFallbackResponseMiddleware(
        {
          spec: { openapi: "3.1.0", info: { title: "Test", version: "1.0.0" } },
          path: "/",
          controller: {},
          method: "GET",
          pathItem: {} as any,
          handler: () => {},
          operation: {} as any,
          req: getMockReq(),
          res: getMockRes().res,
        },
        jest.fn(() => ({ test: true })) as any,
      );
    };

    await expect(test()).rejects.toThrowWithMessage(
      Error,
      /returned a result that was not handled by any middleware/,
    );
  });
});
