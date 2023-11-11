import fs from "fs";

import "reflect-metadata";

import {
  createOpenAPIFromControllers,
  stripSOCExtensions,
} from "@simply-openapi/controllers";

import { types } from "./controllers";
import { info } from "./openapi";

// We can build the OpenAPI spec from the controller class constructors, saving us from having to instantiate them with their dependencies.
// This is particularly useful for generating the spec without having to spin up all of the services that the controllers depend on, such as may
// be the case in DI situations.
// Note that by doing this, the openapi extension on the resultant docs will point to the constructors, not the instances, and
// as such we would need to specify a controllerResolver to instantiate our types in createRouterFromSpec if we wanted to create a router from them.
let docs = createOpenAPIFromControllers(info, types);

// The SOC extensions for creating routers are not needed in the case of creating external docs, so we can strip them out to avoid
// confusion.
// Remove this line if you are curious about how SOC extensions are used to create routers.
docs = stripSOCExtensions(docs);

fs.writeFileSync("./openapi.json", JSON.stringify(docs, null, 2));
process.exit(0);
