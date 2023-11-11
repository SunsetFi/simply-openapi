import { v4 as uuidV4 } from "uuid";

import {
  CreatableWidget,
  Widget,
  WidgetDisposition,
  WidgetId,
  widgetId,
} from "../entities/widgets.schema";

interface GetWidgetsQuery {
  disposition?: WidgetDisposition;
  limit?: number;
  offset?: number;
}

const mockWidgets: Widget[] = [
  {
    id: widgetId(uuidV4()),
    name: "Widget 1",
    disposition: "happy",
  },
  {
    id: widgetId(uuidV4()),
    name: "Widget 2",
    disposition: "sad",
  },
  {
    id: widgetId(uuidV4()),
    name: "Widget 3",
    disposition: "happy",
  },
  {
    id: widgetId(uuidV4()),
    name: "Widget 4",
    disposition: "sad",
  },
];

export async function getWidgets(query: GetWidgetsQuery): Promise<Widget[]> {
  const results = mockWidgets.filter((widget) =>
    filterWidgetForQuery(widget, query)
  );
  return results.slice(
    query.offset ?? 0,
    query.limit ? (query.offset ?? 0) + query.limit : undefined
  );
}

export async function getWidgetById(id: WidgetId): Promise<Widget | null> {
  return mockWidgets.find((widget) => widget.id === id) ?? null;
}

export async function addWidget(widget: CreatableWidget): Promise<Widget> {
  const final: Widget = { ...widget, id: uuidV4() as WidgetId };
  mockWidgets.push(final);
  return final;
}

function filterWidgetForQuery(widget: Widget, query: GetWidgetsQuery): boolean {
  if (query.disposition && widget.disposition !== query.disposition) {
    return false;
  }

  return true;
}
