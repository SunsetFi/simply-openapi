import { bodyRequestDataProcessorFactory } from "./body";
import { parametersRequestDataProcessorFactory } from "./parameters";

export default [
  bodyRequestDataProcessorFactory,
  parametersRequestDataProcessorFactory,
];
