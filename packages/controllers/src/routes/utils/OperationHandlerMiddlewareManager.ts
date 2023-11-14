import {
  OperationHandlerMiddleware,
  OperationHandlerMiddlewareContext,
  OperationHandlerMiddlewareNextFunction,
} from "../handler-middleware/types";

export class OperationHandlerMiddlewareManager {
  private middlewares: OperationHandlerMiddleware[] = [];
  private coreFunction: (...args: any[]) => any;

  constructor(coreFunction: (...args: any[]) => any) {
    this.coreFunction = coreFunction;
  }

  use(...middleware: OperationHandlerMiddleware[]) {
    this.middlewares.push(...middleware);
  }

  async run(
    context: OperationHandlerMiddlewareContext,
    args: any[],
  ): Promise<any> {
    const stack = this.middlewares;

    const executeMiddleware = async (
      index: number,
      args: any[],
    ): Promise<any> => {
      if (index >= stack.length) {
        return this.coreFunction(...args);
      }

      const next: OperationHandlerMiddlewareNextFunction = async () => {
        return executeMiddleware(index + 1, args);
      };

      // We originally wanted handlers to be able to swap out arguments passed to the handler,
      // but that use case is now more robustly covered by request data processors.
      // next.withArgs = async (...newArgs: any[]) => {
      //   return executeMiddleware(index + 1, newArgs);
      // };

      const currentMiddleware = stack[index];
      return currentMiddleware(context, next);
    };

    return executeMiddleware(0, args);
  }
}
