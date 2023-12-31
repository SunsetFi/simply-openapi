import {
  Controller,
  Get,
  JsonResponse,
  EmptyResponse,
  QueryParam,
  PathParam,
  RequiredJsonBody,
  Post,
  HandlerResult,
  RequireAuthentication,
} from "@simply-openapi/controllers";
import HttpStatusCodes from "http-status-codes";
import { NotFound } from "http-errors";

import {
  arrayOf,
  nonEmptyStringSchema,
  numberGTEZeroSchema,
} from "../json-schema";

import {
  CreatableWidget,
  WidgetId,
  creatableWidgetSchema,
  widgetDispositionSchema,
  widgetIdSchema,
  widgetSchema,
} from "../entities/widgets.schema";
import {
  addWidget,
  getWidgetById,
  getWidgets,
} from "../services/widgets.service";
import {
  AuthenticatedUser,
  WidgetAuthenticator,
} from "./widgets.authenticator";

@Controller("widgets", {
  tags: ["widget"],
})
export class WidgetsController {
  @Get("/", {
    description: "Get all widgets",
  })
  @JsonResponse(HttpStatusCodes.OK, arrayOf(widgetSchema), {
    description: "All widgets",
  })
  async getAllWidgets(
    @QueryParam("disposition", widgetDispositionSchema, {
      description: "Filter by disposition",
    })
    disposition?: "happy" | "sad",
    @QueryParam("limit", numberGTEZeroSchema, {
      description: "Limit the number of results",
    })
    limit?: number,
    @QueryParam("offset", numberGTEZeroSchema, {
      description: "Offset the results",
    })
    offset?: number
  ) {
    return getWidgets({ disposition, limit, offset });
  }

  // Note: We are using OpenAPI style curly braces for path parameters here.
  // However, the express style `:id` is also supported.
  @Get("/{id}", {
    description: "Get a widget by ID",
  })
  @JsonResponse(HttpStatusCodes.OK, widgetSchema, {
    description: "The widget",
  })
  @EmptyResponse(HttpStatusCodes.NOT_FOUND, { description: "Widget not found" })
  async getWidgetById(
    @PathParam("id", widgetIdSchema, { description: "The ID of the widget" })
    id: WidgetId
  ) {
    const widget = await getWidgetById(id);
    if (!widget) {
      throw new NotFound(`Widget ${id} not found`);
    }

    return widget;
  }

  @Post("/", {
    description: "Create a widget",
  })
  @JsonResponse(HttpStatusCodes.CREATED, widgetSchema, {
    description: "The created widget",
    headers: {
      Location: {
        schema: nonEmptyStringSchema,
        description: "The location of the created widget",
        required: true,
      },
    },
  })
  @EmptyResponse(HttpStatusCodes.BAD_REQUEST, {
    description: "Invalid widget",
  })
  async createWidget(
    @RequiredJsonBody(creatableWidgetSchema, {
      description: "The content of the widget",
    })
    widget: CreatableWidget,
    // Decorating a parameter with @RequireAuthentication gives us the result of the authenticator.
    @RequireAuthentication(WidgetAuthenticator, ["widgets:write"])
    user: AuthenticatedUser
  ) {
    console.log("Got write request from user with api key", user.apiKey);

    const created = await addWidget(widget);
    return HandlerResult.status(HttpStatusCodes.CREATED)
      .header("Location", `http://myserver.com/widgets/${created.id}`)
      .json(created);
  }
}
