import { securityRequestDataProcessorFactory } from "./security";
import { bodyRequestDataProcessorFactory } from "./body";
import { parametersRequestDataProcessorFactory } from "./parameters";

export default [
  // Do this first so that the security data is available to the other processors.
  securityRequestDataProcessorFactory,
  bodyRequestDataProcessorFactory,
  parametersRequestDataProcessorFactory,
];
