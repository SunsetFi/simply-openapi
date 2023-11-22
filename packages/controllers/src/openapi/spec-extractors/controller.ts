import {
  getSOCControllerMetadata,
  isSOCCustomControllerMetadata,
} from "../../metadata";
import { ControllerObject } from "../../types";

import { OpenAPIObjectExtractor } from "../types";

export const extractSOCControllerSpec: OpenAPIObjectExtractor = (
  controller: ControllerObject,
) => {
  const metadata = getSOCControllerMetadata(controller);
  if (
    !metadata ||
    !isSOCCustomControllerMetadata(metadata) ||
    !metadata.openapiFragment
  ) {
    return undefined;
  }

  return metadata.openapiFragment;
};
