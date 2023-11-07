import { OperationObject } from "openapi3-ts/oas31";
import { PartialDeep } from "type-fest";

import { RequestMethod } from "../../types";
import {
  getSECControllerMethodMetadata,
  isSECBoundControllerMethodMetadata,
  mergeSECControllerMethodMetadata,
} from "../../metadata";

export type MethodDecorator = (
  path: string,
  operationFragment: PartialDeep<OperationObject>
) => (target: any, methodName: string) => void;

export type MethodSettings = Omit<
  OperationObject,
  "parameters" | "requestBody" | "responses"
>;

function createMethodDecorator(method: RequestMethod): MethodDecorator {
  return (path: string, operationFragment: PartialDeep<MethodSettings>) => {
    return function (target: any, methodName: string) {
      const existing = getSECControllerMethodMetadata(target, methodName);
      if (existing && isSECBoundControllerMethodMetadata(existing)) {
        throw new Error(
          `Method handler ${methodName} cannot both be bound to an operation and have http methods specified.`
        );
      }

      if (existing && existing.method) {
        throw new Error(
          `Method handler ${methodName} cannot handle multiple http methods.`
        );
      }

      mergeSECControllerMethodMetadata(
        target,
        { path, method, operationFragment: operationFragment ?? {} },
        methodName
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
