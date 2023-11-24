import { WidgetAuthenticator } from "./widgets.authenticator";
import { WidgetsController } from "./widgets.controller";

// Note: Exporting your types like this is not required to use the library.  It is done here as a demonstration of offline spec generation in build-openapi.
export const types = [WidgetAuthenticator, WidgetsController];

export default [new WidgetAuthenticator(), new WidgetsController()];
