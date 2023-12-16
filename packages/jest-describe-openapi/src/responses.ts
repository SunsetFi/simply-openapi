import { OpenAPIObject, OperationObject } from "openapi3-ts/oas31";
import { omit } from "lodash";

/**
 * Creates jest snapshot tests covering the responses of an operation.
 * @param operation The operation to test.
 * @param spec The OpenAPI specification containing the operation.
 */
export function describeOperationResponsesSnapshots(
  operation: OperationObject,
  spec: OpenAPIObject
) {
  if (Object.keys(operation.responses).length > 0) {
    it(`maintains all response codes`, function () {
      expect(Object.keys(operation.responses)).toMatchSnapshot();
    });

    for (const [code, response] of Object.entries(operation.responses)) {
      it(`maintains the ${code} response`, function () {
        expect(omit(response, ["content", "description"])).toMatchSnapshot();
      });

      for (const [mediaType, schema] of Object.entries(
        (response as any).content ?? {}
      )) {
        it(`maintains the ${code} ${mediaType} response`, function () {
          expect(schema).toMatchSnapshot();
        });
      }
    }
  }
}
