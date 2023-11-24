import { securityRequestProcessorFactory } from "./security";
import { bodyRequestProcessorFactory } from "./body";
import { parametersRequestProcessorFactory } from "./parameters";

export default [
  // Do this first so that the security data is available to the other processors.
  securityRequestProcessorFactory,
  bodyRequestProcessorFactory,
  parametersRequestProcessorFactory,
];
