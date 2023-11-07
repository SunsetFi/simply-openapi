import { RequestHandler } from "express";
import { mergeSECControllerMethodMetadata } from "../../metadata";
import { OperationHandlerMiddleware } from "../../routes";

export interface UseRequestMiddlewareOpts {
  order?: "before" | "after";
}
export function UseRequestMiddleware(
  middleware: RequestHandler,
  opts: UseRequestMiddlewareOpts = { order: "after" }
): MethodDecorator {
  return (target: any, propertyKey: string | symbol | undefined) => {
    if (propertyKey === undefined) {
      throw new Error(`@UseRequestMiddleware() must be applied to a method.`);
    }

    mergeSECControllerMethodMetadata(
      target,
      (metadata) => {
        const expressMiddleware = [...(metadata.expressMiddleware ?? [])];
        if (opts.order === "before") {
          expressMiddleware.unshift(middleware);
        } else {
          expressMiddleware.push(middleware);
        }
        return {
          ...metadata,
          expressMiddleware,
        };
      },
      propertyKey
    );
  };
}

export interface UseHandlerMiddlewareOpts {
  order?: "before" | "after";
}
export function UseHandlerMiddleware(
  middleware: OperationHandlerMiddleware,
  opts: UseRequestMiddlewareOpts = { order: "after" }
): MethodDecorator {
  return (target: any, propertyKey: string | symbol | undefined) => {
    if (propertyKey === undefined) {
      throw new Error(`@UseRequestMiddleware() must be applied to a method.`);
    }

    mergeSECControllerMethodMetadata(
      target,
      (metadata) => {
        const handlerMiddleware = [...(metadata.handlerMiddleware ?? [])];
        if (opts.order === "before") {
          handlerMiddleware.unshift(middleware);
        } else {
          handlerMiddleware.push(middleware);
        }
        return {
          ...metadata,
          handlerMiddleware,
        };
      },
      propertyKey
    );
  };
}
