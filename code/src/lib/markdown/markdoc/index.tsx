import React from "react";
import Markdoc from "@markdoc/markdoc";
import { markdocConfig } from "./config";
import UiCard from "../blocks/card";
import UiKpi from "../blocks/kpi";
import UiSteps from "../blocks/steps";

const components = { UiCard, UiKpi, UiSteps };

export function renderMarkdoc(markdown: string) {
  const ast = Markdoc.parse(markdown);
  const content = Markdoc.transform(ast, markdocConfig);
  return Markdoc.renderers.react(content, React, { components });
}
