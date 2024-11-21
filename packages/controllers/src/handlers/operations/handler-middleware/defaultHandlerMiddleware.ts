import { operationHandlerResponseObjectMiddleware } from "./responses/handler-result/middleware";
import { securityProcessorMiddlewareFactory } from "./security/security-procesor";
import { operationHandlerJsonResponseMiddleware } from "./responses/json-response";
import { bodyProcessorMiddlewareFactory } from "./body-processor";
import { parametersProcessorMiddlewareFactory } from "./parameters/parameter-processor";

export default [
  // Process security first, so we dont perform any checks on content if security fails.
  securityProcessorMiddlewareFactory,
  parametersProcessorMiddlewareFactory,
  bodyProcessorMiddlewareFactory,
  operationHandlerResponseObjectMiddleware,
  operationHandlerJsonResponseMiddleware,
];
