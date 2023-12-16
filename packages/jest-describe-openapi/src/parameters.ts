import { OpenAPIObject, OperationObject } from "openapi3-ts/oas31";
import { omit, sortBy } from "lodash";

import { resolveReference } from "./utils";

/**
 * Creates jest snapshot tests covering the parameters of an operation.
 * @param operation The operation to test.
 * @param spec The OpenAPI specification containing the operation.
 */
export function describeOperationParameterSnapshots(
  operation: OperationObject,
  spec: OpenAPIObject
) {
  const parameters = operation.parameters;
  if (parameters) {
    const resolvedParams = sortBy(
      parameters.map((x) => resolveReference(spec, x)),
      ["in", "name"]
    );
    it(`maintains all parameters`, function () {
      expect(resolvedParams.map((x) => `${x.in}:${x.name}`)).toMatchSnapshot();
    });

    for (const parameter of resolvedParams) {
      it(`maintains the ${parameter.name} ${parameter.in} parameter`, function () {
        expect(omit(parameter, "description")).toMatchSnapshot();
      });
    }
  }
}
