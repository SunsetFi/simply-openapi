import express from "express";
import { Express } from "express-serve-static-core";

import requireDir from "require-dir";
import { values } from "lodash";
import {
  serve as swaggerServe,
  setup as swaggerSetup
} from "swagger-ui-express";

// Set us up to use simply-express-controllers from our root project.
//  This step should not be included in a real project.
try {
  require.resolve("simply-express-controllers");
} catch {
  const mockRequire = require("mock-require");
  mockRequire("simply-express-controllers", require("../../"));
}

import {
  createControllerRoute,
  createSwaggerPaths
} from "simply-express-controllers";

const { version } = require("../package.json");

import { Port } from "./config";

export function runServer() {
  // If we were using DI, we could use fetch all controllers using
  //  a common DI binding.
  // For this example, we bulk import all files in the controller folder
  //  and collect their default exports.
  const controllers = values(requireDir(__dirname + "/controllers")).map(
    exports => new exports.default()
  );

  const app = express();

  app.use((req: any, resp, next) => {
    // TOOD: load our jwt
    req.user = {};
    next();
  });

  // Create a router to implement all our controllers
  const router = createControllerRoute(...controllers);
  app.use(router);

  setupSwagger(app, controllers);

  app.listen(Port);
}

function setupSwagger(app: Express, controllers: any[]) {
  const swaggerDocs = {
    openapi: "3.0.0",
    info: {
      title: "Soapdish Example",
      description: "Hello World",
      version
    },
    servers: [
      {
        url: "http://localhost:8080",
        description: "The Server"
      }
    ],
    paths: createSwaggerPaths(...controllers)
  };
  app.use("/api-docs", swaggerServe, swaggerSetup(swaggerDocs));
}
