import "reflect-metadata";

import express from "express";
import {
  serve as swaggerServe,
  setup as swaggerSetup,
} from "swagger-ui-express";

import {
  createOpenAPIFromControllers,
  createRouterFromSpec,
} from "@simply-openapi/controllers";

import controllers from "./controllers";
import { info } from "./openapi";

const app = express();

const docs = createOpenAPIFromControllers(info, controllers);
const router = createRouterFromSpec(docs);

app.use(router);

app.use("/openapi", swaggerServe, swaggerSetup(docs));

app.listen(8080);

console.log("Server started on port 8080");
