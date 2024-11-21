import {
  OpenAPIObject,
  OperationObject,
  SecurityRequirementObject,
} from "openapi3-ts/oas31";
import { get, uniq } from "lodash";
import { set, mergeWith as mergeWithFp } from "lodash/fp";

import {
  SOCCustomControllerMetadata,
  getSOCControllerMetadata,
  getSOCControllerMethodMetadata,
  isSOCCustomControllerMetadata,
  isSOCCustomControllerMethodMetadata,
} from "../../metadata";
import { joinUrlPaths } from "../../urls";
import { ControllerObject } from "../../types";
import { mergeCombineArrays } from "../../utils";

import { OpenAPIObjectExtractor } from "../types";
import {
  SOCControllerMethodExtensionData,
  SOCControllerMethodExtensionName,
} from "../extensions";
import { nameController } from "../utils";

export const extractSOCCustomMethodSpec: OpenAPIObjectExtractor = (
  controller: ControllerObject,
  methodName: string | symbol,
) => {
  const controllerMetadata = getSOCControllerMetadata(controller);

  const metadata = getSOCControllerMethodMetadata(controller, methodName);
  if (!metadata || !isSOCCustomControllerMethodMetadata(metadata)) {
    return undefined;
  }

  if (
    controllerMetadata &&
    !isSOCCustomControllerMetadata(controllerMetadata)
  ) {
    throw new Error(
      `Cannot extract OpenAPI spec for method ${String(
        methodName,
      )} of controller ${nameController(
        controller,
      )} because it is a bound controller and the method is not a bound controller method.  If you would like to mix bound and unbound controllers, you may do so with the @Controller decorator, or omit the decorator entirely.`,
    );
  }

  const customControllerMetadata =
    controllerMetadata as SOCCustomControllerMetadata | null;

  const path = joinUrlPaths(
    (controllerMetadata as any)?.path ?? "/",
    metadata.path,
  );

  // controller middleware should run before operation middleware
  const handlerMiddleware = [
    ...(controllerMetadata?.handlerMiddleware ?? []),
    ...(metadata.handlerMiddleware ?? []),
  ];

  const extension: SOCControllerMethodExtensionData = {
    controller,
    handler: methodName,
    handlerArgs: metadata.handlerArgs ?? [],
  };

  if (handlerMiddleware.length > 0) {
    extension.handlerMiddleware = handlerMiddleware;
  }

  let security: SecurityRequirementObject[] = [];
  if (customControllerMetadata?.sharedOperationFragment?.security) {
    security.push(...customControllerMetadata.sharedOperationFragment.security);
  }

  if (metadata.operationFragment?.security) {
    security = mergeSecurityReqs(security, metadata.operationFragment.security);
  }

  return (spec: OpenAPIObject) => {
    const op: OperationObject = {
      operationId: `${nameController(controller)}.${String(methodName)}`,
      responses: {},
      ...mergeCombineArrays(
        {},
        get(spec, ["paths", path, metadata.method], {}),
        customControllerMetadata?.sharedOperationFragment as OperationObject,
        metadata.operationFragment as OperationObject,
      ),
      [SOCControllerMethodExtensionName]: extension,
    };

    if (security.length > 0) {
      op.security = security;
    }

    return set(["paths", path, metadata.method], op, spec);
  };
};

function mergeSecurityReqs(
  target: SecurityRequirementObject[],
  sources: SecurityRequirementObject[],
) {
  target = target.slice();
  for (const source of sources) {
    const mergeIntoIndex: number = target.findIndex((s) => {
      const sKeys = Object.keys(s);
      const secKeys = Object.keys(source);
      return (
        sKeys.length === secKeys.length &&
        sKeys.every((k) => secKeys.includes(k))
      );
    });
    if (mergeIntoIndex >= 0) {
      target[mergeIntoIndex] = mergeWithFp(
        (objValue, srcValue): any => {
          if (Array.isArray(objValue)) {
            return uniq(objValue.concat(srcValue));
          }
        },
        target[mergeIntoIndex],
        source,
      );
    } else {
      target.push(source);
    }
  }

  return target;
}
