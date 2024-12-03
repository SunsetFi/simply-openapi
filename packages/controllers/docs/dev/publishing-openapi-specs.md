# Publishing your OpenAPI specification

While the OpenAPI spec produced by createOpenAPIFromControllers is fully formed and valid, you may wish to strip away metadata describing the handlers before publishing it. The `stripSOCExtensions` function is provided to do this.

```typescript
let docs = createOpenAPIFromControllers(info, types);

docs = stripSOCExtensions(docs);
```

This will generate a copy of the documentatin that has all @simply-openapi/controllers extensions removed from it.

## Hosting your spec with swagger

As with any OpenAPI document object, you can host it from your own application using `swagger-ui-express`

```typescript
import express from "express";
import {
  serve as swaggerServe,
  setup as swaggerSetup,
} from "swagger-ui-express";

import {
  createOpenAPIFromControllers,
  stripSOCExtensions
} from "@simply-openapi/controllers";

import { controllers } from "./controllers";

const app = express();

const docs = createOpenAPIFromControllers(..., controllers);

...

// This step is optional.
const strippedDocs = stripSOCExtensions(docs);

app.use("/openapi", swaggerServe, swaggerSetup(strippedDocs));

app.listen(8080);

```

## Hosting your spec with Stoplight Elements

For a more feature packed and polished OpenAPI UI, you may wish to use (Stoplight Elements)[https://github.com/stoplightio/elements].

This can be easily integrated into your application with unpkg.com:

```typescript

import express, { Router } from "express";
import {
  createOpenAPIFromControllers,
  stripSOCExtensions
} from "@simply-openapi/controllers";
import { escape } from "html-escaper";

import { controllers } from "./controllers";

const app = express();

const docs = createOpenAPIFromControllers(..., controllers);

...

// This step is optional.
const strippedDocs = stripSOCExtensions(docs);

app.use("/openapi", createDocumentationRouter(strippedDocs));

app.listen(8080);


function createDocumentationRouter(spec: OpenAPIObject) {
  const router = Router();

  router.get("/", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(spec, null, 2));
  });

  router.get("/elements", (req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(`
    <!DOCTYPE HTML>
    <html>
      <head>
        <script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
        <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css">
        <title>${escape(spec.info.title)}</title>
      </head>
      <body>
        <elements-api
          style="display: inline-block; width: 100vw; height: 100vh"
          apiDescriptionDocument="${escape(JSON.stringify(spec))}"
          router="hash"
        />
      </body>
    </html>
    `);
  });
}
```
