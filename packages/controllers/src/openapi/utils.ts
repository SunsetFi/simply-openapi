import { ControllerObject } from "../types";

export function nameController(controller: ControllerObject) {
  return (controller as any).name ?? controller.constructor.name;
}
