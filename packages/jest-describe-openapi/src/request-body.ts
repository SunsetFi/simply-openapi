import { OperationObject, OpenAPIObject } from "openapi3-ts/oas31";
import { omit } from "lodash";

import { resolveReference } from "./utils";

/**
 * Creates jest snapshot tests covering the request body of an operation.
 * @param operation The operation to test.
 * @param spec The OpenAPI specification containing the operation.
 */
export function describeOperationRequestBodySnapshots(
  operation: OperationObject,
  spec: OpenAPIObject,
) {
  const requestBody = operation.requestBody;
  if (requestBody) {
    const resolvedRequestBody = resolveReference(spec, requestBody);

    it(`maintains the request body`, function () {
      expect(omit(resolvedRequestBody, "description")).toMatchSnapshot();
    });

    it(`maintains all request media types`, function () {
      expect(Object.keys(resolvedRequestBody.content).sort()).toMatchSnapshot();
    });

    for (const [mediaType, mediaTypeObject] of Object.entries(
      resolvedRequestBody.content,
    )) {
      it(`maintains the ${mediaType} request body`, function () {
        expect(mediaTypeObject).toMatchSnapshot();
      });
    }
  }
}
