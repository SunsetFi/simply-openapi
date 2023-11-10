import { OpenAPIObject, OperationObject, PathsObject } from "openapi3-ts/oas31";
import { get, merge } from "lodash";
import { set } from "lodash/fp";

import {
  getSOCControllerMetadata,
  getSOCControllerMethodMetadata,
  isSOCCustomControllerMethodMetadata,
} from "../../metadata";
import { joinUrlPaths } from "../../urls";

import { ControllerInstance, OpenAPIObjectExtractor } from "../types";
import {
  SOCControllerMethodExtensionData,
  SOCControllerMethodExtensionName,
} from "../extensions";

export const extractSOCCustomMethodSpec: OpenAPIObjectExtractor = (
  controller: ControllerInstance,
  methodName: string | symbol
) => {
  const controllerMetadata = getSOCControllerMetadata(controller);
  const metadata = getSOCControllerMethodMetadata(controller, methodName);
  if (
    !controllerMetadata ||
    controllerMetadata.type !== "custom" ||
    !metadata
  ) {
    return undefined;
  }

  if (!isSOCCustomControllerMethodMetadata(metadata)) {
    return undefined;
  }

  const path = joinUrlPaths(controllerMetadata.path ?? "/", metadata.path);

  const extension: SOCControllerMethodExtensionData = {
    controller,
    handler: methodName,
    handlerArgs: metadata.args,
    // controller middleware should run before operation middleware
    expressMiddleware: [
      ...(controllerMetadata?.expressMiddleware ?? ([] as any)),
      ...(metadata.expressMiddleware ?? []),
    ],
    handlerMiddleware: [
      ...(controllerMetadata?.handlerMiddleware ?? ([] as any)),
      ...(metadata.handlerMiddleware ?? []),
    ],
  };

  return (spec: OpenAPIObject) => {
    const op: OperationObject = {
      ...merge(
        {},
        get(spec, ["paths", path, metadata.method], {}),
        metadata.operationFragment as OperationObject
      ),
      tags: [
        ...get(spec, ["paths", path, metadata.method, "tags"], []),
        ...(controllerMetadata.tags ?? []),
        ...(metadata.operationFragment.tags ?? []),
      ],
      [SOCControllerMethodExtensionName]: extension,
    };
    return set(["paths", path, metadata.method], op, spec);
  };
};
