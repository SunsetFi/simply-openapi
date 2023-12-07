import { Constructor } from "type-fest";

import { requestMethods } from "./utils";

export type RequestMethod = (typeof requestMethods)[number];

export type ControllerObject = object | Constructor<any>;
export type ControllerInstance = object;

export type MaybePromise<T> = T | Promise<T>;
