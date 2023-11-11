import { ErrorRequestHandler, RequestHandler } from "express";
import { requestMethods } from "./utils";
import { Constructor } from "type-fest";

export type RequestMethod = (typeof requestMethods)[number];

export type Middleware = RequestHandler | ErrorRequestHandler;

export type ControllerObject = object | Constructor<any>;
export type ControllerInstance = object;
