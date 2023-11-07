import { getMockReq, getMockRes } from "@jest-mock/express";

import { operationHandlerFallbackResponseMiddleware } from "./OperationHandlerFallbackResponseMiddleware";

describe("operationHandlerFallbackResponseMiddleware", function () {
  it("errors when no response has been sent", function () {
    const test = async () => {
      await operationHandlerFallbackResponseMiddleware(
        {
          path: "/",
          controller: {},
          method: "GET",
          pathItem: {} as any,
          handler: () => {},
          handlerArgs: [],
          operation: {} as any,
          req: getMockReq(),
          res: getMockRes().res,
        },
        jest.fn(() => null) as any
      );
    };

    expect(test()).rejects.toThrowWithMessage(
      Error,
      /handler did not send a response/
    );
  });
});
