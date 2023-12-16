import { OpenAPIObject, OperationObject } from "openapi3-ts/oas31";
import { sortBy } from "lodash";

/**
 * Creates jest snapshot tests covering the security specifications of an operation.
 * @param operation The operation to test.
 * @param spec The OpenAPI specification containing the operation.
 */
export function describeOperationSecuritySnapshots(
  operation: OperationObject,
  spec: OpenAPIObject
) {
  const security = operation.security;
  if (security) {
    // The array order has no meaning.  Stabilize it for snapshot testing.
    const sortedSecurity = sortBy(security, (x) =>
      Object.keys(x).sort().join(",")
    );

    it(`maintains all security schemes`, function () {
      const schemePairs = sortedSecurity.map((x) => Object.keys(x).sort());
      expect(schemePairs).toMatchSnapshot();
    });

    for (let i = 0; i < sortedSecurity.length; i++) {
      const scheme = sortedSecurity[i];
      for (const key of Object.keys(scheme)) {
        it(`maintains the scopes for scheme ${key} in option ${
          i + 1
        }`, function () {
          expect(scheme[key].sort()).toMatchSnapshot();
        });
      }
    }
  }
}
