import { operationHandlerResponseObjectMiddleware } from "./handler-result/middleware";
import { securityProcessorMiddlewareFactory } from "./security/security-procesor";
import { operationHandlerJsonResponseMiddleware } from "./json-response";
import { bodyProcessorMiddlewareFactory } from "./body-processor";

export default [
  // Process security first, so we dont perform any checks on content if security fails.
  securityProcessorMiddlewareFactory,
  bodyProcessorMiddlewareFactory,
  operationHandlerJsonResponseMiddleware,
  operationHandlerResponseObjectMiddleware,
];
