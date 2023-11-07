import { getMockReq, getMockRes } from "@jest-mock/express";
import { operationHandlerJsonResponseMiddleware } from "./JsonResponseMiddleware";
import "jest-extended";

describe("operationHandlerJsonResponseMiddleware", function () {
  it("throws an error if the response is not JSON serializable", function () {
    const test = async () => {
      await operationHandlerJsonResponseMiddleware(
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
        jest.fn(() => ({
          nonSerializableValue: () => void 0,
        })) as any
      );
    };

    expect(test()).rejects.toThrowWithMessage(Error, /not JSON serializable/);
  });

  it("throws an error if the response is already sent", function () {
    const test = async () => {
      await operationHandlerJsonResponseMiddleware(
        {
          path: "/",
          controller: {},
          method: "GET",
          pathItem: {} as any,
          handler: () => {},
          handlerArgs: [],
          operation: {} as any,
          req: getMockReq(),
          res: getMockRes({ headersSent: true }).res,
        },
        jest.fn(() => ({
          value: 42,
        })) as any
      );
    };

    expect(test()).rejects.toThrowWithMessage(
      Error,
      /already sent its headers/
    );
  });

  it("does nothing if no result is returned", async function () {
    const test = async () => {
      await operationHandlerJsonResponseMiddleware(
        {
          path: "/",
          controller: {},
          method: "GET",
          pathItem: {} as any,
          handler: () => {},
          handlerArgs: [],
          operation: {} as any,
          req: getMockReq(),
          res: getMockRes({ headersSent: true }).res,
        },
        jest.fn((x) => undefined) as any
      );
    };

    expect(test()).resolves.toBeUndefined();
  });

  it("sends the json response if one is provided", async function () {
    const res = getMockRes().res;
    const result = { value: 42 };
    const test = async () => {
      await operationHandlerJsonResponseMiddleware(
        {
          path: "/",
          controller: {},
          method: "GET",
          pathItem: {} as any,
          handler: () => {},
          handlerArgs: [],
          operation: {} as any,
          req: getMockReq(),
          res: res,
        },
        jest.fn((x) => result) as any
      );
    };

    expect(test()).resolves.toBeUndefined();
    expect(res.json).toHaveBeenCalledWith(result);
  });
});
