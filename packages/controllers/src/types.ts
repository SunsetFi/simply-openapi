import { Constructor } from "type-fest";
import { ErrorRequestHandler, RequestHandler } from "express";

import { requestMethods } from "./utils";

export type RequestMethod = (typeof requestMethods)[number];

export type Middleware = RequestHandler | ErrorRequestHandler;

export type ControllerObject = object | Constructor<any>;
export type ControllerInstance = object;

export type MaybePromise<T> = T | Promise<T>;
