import { getSOCControllerMetadata } from "../metadata";

export function ensureAtMostOneController(target: any) {
  const metadata = getSOCControllerMetadata(target);
  if (metadata?.type) {
    throw new Error(
      `Controller ${target.name} cannot have multiple @Controller, @BoundController, or @Authenticator decorators.`,
    );
  }
}
