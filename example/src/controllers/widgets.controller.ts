import HttpStatusCodes from "http-status-codes";
import createError from "http-errors";
import {
  controller,
  get,
  post,
  queryParam,
  pathParam,
  response,
  body,
  result
} from "simply-express-controllers";

import WidgetRepository, {
  widgetSchema,
  CreateWidgetRequest,
  createWidgetRequestSchema
} from "../services/WidgetRepository";

import { RootURL } from "../config";

@controller("/widgets")
export default class WidgetsController {
  @get({
    summary: "Gets all widgets",
    tags: ["widgets"]
  })
  @response(HttpStatusCodes.OK, {
    description: "An array of widgets",
    schema: {
      type: "array",
      items: widgetSchema
    }
  })
  public async getWidgets(
    @queryParam("limit", {
      schema: {
        type: "integer",
        description: "The limit of items to return.",
        minimum: 0
      }
    })
    limit: number | undefined
  ) {
    const widgets = await WidgetRepository.getAll();
    if (limit) {
      return widgets.slice(0, limit);
    }
    return widgets;
  }

  @get("/:widget_id", {
    summary: "Gets a specific widget",
    tags: ["widgets"]
  })
  @response(HttpStatusCodes.OK, {
    description: "The widget was found",
    schema: widgetSchema
  })
  @response(HttpStatusCodes.NOT_FOUND, {
    description: "The requested widget ID was not found"
  })
  public async getWidget(
    @pathParam("widget_id", {
      schema: {
        type: "integer",
        description: "The ID of the widget to fetch."
      }
    })
    widgetId: number
  ) {
    const widget = await WidgetRepository.get(widgetId);
    if (!widget) {
      throw createError(HttpStatusCodes.NOT_FOUND, "Widget does not exist.");
    }
    return widget;
  }

  @post({
    summary: "Creates a new widget",
    tags: ["widgets"]
  })
  @response(HttpStatusCodes.CREATED, {
    description: "The widget has been successfully created",
    schema: widgetSchema
  })
  public async createWidget(
    @body({
      required: true,
      schema: createWidgetRequestSchema
    })
    body: CreateWidgetRequest
  ) {
    const widget = await WidgetRepository.create(body);

    return result(widget)
      .status(HttpStatusCodes.CREATED)
      .header("Content-Location", `${RootURL}/widgets/${widget.id}`);
  }
}
