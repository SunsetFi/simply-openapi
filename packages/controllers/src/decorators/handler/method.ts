import { OperationObject } from "openapi3-ts/oas31";
import { PartialDeep } from "type-fest";

import { RequestMethod } from "../../types";
import {
  getSOCControllerMethodMetadata,
  isSOCBoundControllerMethodMetadata,
  mergeSOCControllerMethodMetadata,
} from "../../metadata";
import { expressToOpenAPIPath } from "../../urls";

export type MethodDecorator = (
  path: string,
  operationFragment?: PartialDeep<OperationObject>,
) => (target: any, methodName: string) => void;

export type MethodSettings = Omit<
  OperationObject,
  "parameters" | "requestBody" | "responses"
>;

function createMethodDecorator(method: RequestMethod): MethodDecorator {
  return (
    path: string,
    operationFragment: PartialDeep<MethodSettings> = {},
  ) => {
    path = expressToOpenAPIPath(path);
    return function (target: any, methodName: string | symbol) {
      if (methodName === undefined) {
        throw new Error(
          `@${method.toUpperCase()}() must be applied to a method.`,
        );
      }

      const existing = getSOCControllerMethodMetadata(target, methodName);
      if (existing && isSOCBoundControllerMethodMetadata(existing)) {
        throw new Error(
          `Method handler ${String(
            methodName,
          )} cannot both be bound to an operation and have http methods specified.`,
        );
      }

      if (existing && existing.method) {
        throw new Error(
          `Method handler ${String(
            methodName,
          )} cannot handle multiple http methods.`,
        );
      }

      mergeSOCControllerMethodMetadata(
        target,
        { path, method, operationFragment: operationFragment ?? {} },
        methodName,
      );
    };
  };
}

export const Get = createMethodDecorator("get");
export const Post = createMethodDecorator("post");
export const Put = createMethodDecorator("put");
export const Delete = createMethodDecorator("delete");
export const Patch = createMethodDecorator("patch");
export const Head = createMethodDecorator("head");
export const Options = createMethodDecorator("options");
export const Trace = createMethodDecorator("trace");
