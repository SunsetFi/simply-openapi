import { JSONSchema6 } from "json-schema";

export interface Widget {
  id: number;
  name: string;
  disposition: "happy" | "sad";
}
export const widgetSchema: Readonly<JSONSchema6> = Object.seal({
  type: "object",
  properties: {
    id: { type: "integer" },
    name: { type: "string" },
    disposition: { type: "string", enum: ["happy", "sad"] }
  },
  required: ["id", "name", "disposition"]
});

export type CreateWidgetRequest = Omit<Widget, "id">;
export const createWidgetRequestSchema: Readonly<JSONSchema6> = Object.seal({
  type: "object",
  proerties: {
    name: { type: "string" },
    disposition: { enum: ["happy", "sad"] }
  },
  required: ["name", "disposition"]
});

export default class WidgetRepository {
  private static _nextId = 0;
  private static _widgets: Widget[] = [];

  static async getAll(): Promise<Widget[]> {
    return WidgetRepository._widgets;
  }

  static async get(widgetId: number): Promise<Widget | null> {
    return WidgetRepository._widgets.find(x => x.id === widgetId) || null;
  }

  static async create(widget: CreateWidgetRequest): Promise<Widget> {
    const newWidget = {
      id: WidgetRepository._nextId++,
      ...widget
    };
    WidgetRepository._widgets.push(newWidget);
    return newWidget;
  }
}
