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
        jest.fn(() => null) as any,
      );
    };

    await expect(test()).rejects.toThrowWithMessage(
      Error,
      /handler did not send a response/,
    );
  });
});
