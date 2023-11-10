import { ErrorRequestHandler, RequestHandler } from "express";
import { requestMethods } from "./utils";

export type RequestMethod = (typeof requestMethods)[number];

export type Middleware = RequestHandler | ErrorRequestHandler;
