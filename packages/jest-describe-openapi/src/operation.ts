import { OperationObject, OpenAPIObject } from "openapi3-ts/oas31";

import { describeOperationParameterSnapshots } from "./parameters";
import { describeOperationRequestBodySnapshots } from "./request-body";
import { describeOperationResponsesSnapshots } from "./responses";
import { describeOperationSecuritySnapshots } from "./security";

/**
 * Creates jest snapshot tests covering the security, parameters, request body, and responses of an operation.
 * @param operation The operation to test.
 * @param spec The OpenAPI specification containing the operation.
 */
export function describeOperationSnapshots(
  operation: OperationObject,
  spec: OpenAPIObject
) {
  describe("security", function () {
    describeOperationSecuritySnapshots(operation, spec);
  });

  describe("parameters", function () {
    describeOperationParameterSnapshots(operation, spec);
  });

  describe("request body", function () {
    describeOperationRequestBodySnapshots(operation, spec);
  });

  describe("responses", function () {
    describeOperationResponsesSnapshots(operation, spec);
  });
}
