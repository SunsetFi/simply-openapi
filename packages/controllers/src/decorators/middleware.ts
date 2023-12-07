import { OperationHandlerMiddleware } from "../handlers";
import {
  SOCControllerMethodMetadata,
  mergeSOCControllerMetadata,
  mergeSOCControllerMethodMetadata,
  SOCControllerMetadata,
} from "../metadata";

export function UseHandlerMiddleware(middleware: OperationHandlerMiddleware) {
  return (target: any, propertyKey?: string | symbol | undefined) => {
    function middlewareInjector<
      T extends SOCControllerMetadata | SOCControllerMethodMetadata,
    >(originalMetadata: T): T {
      const handlerMiddleware = [
        ...(originalMetadata.handlerMiddleware ?? []),
        middleware,
      ];
      return {
        ...originalMetadata,
        handlerMiddleware,
      };
    }

    if (propertyKey) {
      mergeSOCControllerMethodMetadata(target, middlewareInjector, propertyKey);
    } else {
      mergeSOCControllerMetadata(target, middlewareInjector);
    }
  };
}
