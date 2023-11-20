import {
  getMockReq as getMockReqReal,
  getMockRes as getMockResReal,
} from "@jest-mock/express";
import { MockRequest } from "@jest-mock/express/dist/src/request";
import { Response } from "express";

export function getMockReq(
  method: string,
  url: string,
  opts: MockRequest = {},
) {
  return getMockReqReal({
    url,
    method,
    ...opts,
  });
}

function json(this: Response) {
  this.headersSent = true;
  return this;
}
export function getMockRes() {
  const { res, next } = getMockResReal();
  res.json = jest.fn().mockImplementation(json);
  return { res, next };
}
