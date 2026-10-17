import { getBatchPlanProgressText } from "./batchPlanProgressText";
import { formatNotebookAiError } from "@/lib/notebook-ai/errors";
import type { ToolProgressPart, ProgressStep } from "./toolProgressModel";
import {
  readObject,
  asString,
  truncate,
  SKILL_LABELS,
} from "./toolProgressValues";
import messages from "./toolProgressText.messages.yaml";
import { createTranslator } from "@/i18n";
const t = createTranslator(messages);

function countOutput(output: unknown) {
  return Array.isArray(output) ? output.length : undefined;
}

export function getToolProgressStepText(
  part: ToolProgressPart,
): Pick<ProgressStep, "label" | "detail"> {
  const input = readObject(part.input);
  const output = readObject(part.output);
  const outputCount = countOutput(part.output);
  const outputError = asString(output?.error) || asString(part.errorText);
  const title =
    asString(input?.title) ||
    asString(output?.title) ||
    asString(input?.pageId) ||
    asString(output?.pageId);

  if (part.type === "tool-loadSkill") {
    const skill = asString(input?.skill);
    const skillLabel = SKILL_LABELS[skill] || t("required");
    return {
      get label() { return t("loadCapability"); },
      detail: output ? t("detailLoadedCapability", { value1: skillLabel }) : t("detailLoadingCapability", { value1: skillLabel }),
    };
  }

  if (part.type === "tool-listNotebooks") {
    return {
      get label() { return t("viewNotebooks"); },
      detail:
        outputCount === undefined
          ? t("viewingAvailableNotebooks")
          : t("detailNotebooksViewed", { value1: outputCount }),
    };
  }

  if (part.type === "tool-listPages") {
    return {
      get label() { return t("listPages"); },
      detail:
        outputCount === undefined
          ? t("viewingPagesInThisNotebook")
          : t("detailPagesViewed", { value1: outputCount }),
    };
  }

  if (part.type === "tool-searchNotes") {
    const query = truncate(asString(input?.query) || t("keyword"));
    return {
      get label() { return t("searchNotes"); },
      detail:
        outputCount === undefined
          ? t("detailSearchingFor", { value1: query })
          : outputCount > 0
            ? t("detailResultsFor", { value1: query, value2: outputCount })
            : t("detailNoResultsFor", { value1: query }),
    };
  }

  if (part.type === "tool-searchWeb") {
    const query = truncate(asString(input?.query) || t("keyword"));
    if (outputError)
      return { get label() { return t("searchTheWeb"); }, detail: formatNotebookAiError(outputError) };
    return {
      get label() { return t("searchTheWeb"); },
      detail: output ? t("detailWebSearchForComplete", { value1: query }) : t("detailSearchingFor", { value1: query }),
    };
  }

  if (part.type === "tool-readWebPage") {
    const url = asString(input?.url);
    const host = (() => {
      try {
        return url ? new URL(url).hostname : t("webPage");
      } catch {
        return t("webPage");
      }
    })();
    if (outputError)
      return { get label() { return t("readWebPage"); }, detail: formatNotebookAiError(outputError) };
    return {
      get label() { return t("readWebPage"); },
      detail: output
        ? t("detailRead", { value1: truncate(host) })
        : t("detailReading", { value1: truncate(host) }),
    };
  }

  if (part.type === "tool-readPage") {
    if (outputError)
      return { get label() { return t("readNote"); }, detail: formatNotebookAiError(outputError) };
    return {
      get label() { return t("readNote"); },
      detail: title ? t("detailRead10", { value1: truncate(title) }) : t("readingTheCurrentNote"),
    };
  }

  if (part.type === "tool-createPage") {
    return {
      get label() { return t("createPage"); },
      detail: title ? t("detailCreate", { value1: truncate(title) }) : t("creatingAPage"),
    };
  }

  if (part.type === "tool-updatePage") {
    const ok = output?.ok === true;
    const needsMarkdown = output?.needsMarkdown === true;
    return {
      get label() { return t("updatePage"); },
      detail: needsMarkdown
        ? t("waitingForTheFullContentBeforeSaving")
        : ok
          ? title
            ? t("detailUpdated", { value1: truncate(title) })
            : t("currentPageUpdated")
          : title
            ? t("detailUpdating", { value1: truncate(title) })
            : t("updatingCurrentPage"),
    };
  }

  if (part.type === "tool-replaceInPage") {
    const replacedCount =
      typeof output?.replacedCount === "number"
        ? output.replacedCount
        : undefined;
    return {
      get label() { return t("replaceContent"); },
      detail:
        replacedCount === undefined
          ? title
            ? t("detailReplacingContentIn", { value1: truncate(title) })
            : t("replacingPageContent")
          : replacedCount > 0
            ? title
              ? t("detailReplacementsIn", { value1: truncate(title), value2: replacedCount })
              : t("detailReplacementsMade", { value1: replacedCount })
            : title
              ? t("detailNoMatchingContentToReplaceIn", { value1: truncate(title) })
              : t("noMatchingContentToReplace"),
    };
  }

  if (part.type === "tool-appendToPage") {
    const ok = output?.ok === true;
    return {
      get label() { return t("appendContent"); },
      detail: outputError
        ? formatNotebookAiError(outputError)
        : ok
          ? title
            ? t("detailContentAppendedTo", { value1: truncate(title) })
            : t("contentAppendedToCurrentPage")
          : title
            ? t("detailAppendingContentTo", { value1: truncate(title) })
            : t("appendingPageContent"),
    };
  }

  if (part.type === "tool-renamePage") {
    const ok = output?.ok === true;
    return {
      get label() { return t("renamePage"); },
      detail: outputError
        ? formatNotebookAiError(outputError)
        : ok
          ? title
            ? t("detailRenamedTo", { value1: truncate(title) })
            : t("renamed")
          : title
            ? t("detailRenamingTo", { value1: truncate(title) })
            : t("renamingPage"),
    };
  }

  if (part.type === "tool-deletePages") {
    const deletedCount =
      typeof output?.deletedCount === "number"
        ? output.deletedCount
        : undefined;
    return {
      get label() { return t("deletePages"); },
      detail: outputError
        ? formatNotebookAiError(outputError)
        : deletedCount === undefined
          ? t("movingPagesToTrash")
          : t("detailPagesDeleted", { value1: deletedCount }),
    };
  }

  if (part.type === "tool-executeBatchPlan") {
    return getBatchPlanProgressText(part, input, output, title);
  }

  if (part.type === "tool-showTable") {
    return {
      get label() { return t("showTable"); },
      detail: title ? t("detailTableGenerated", { value1: truncate(title) }) : t("tableGenerated"),
    };
  }

  if (part.type === "tool-showChart") {
    return {
      get label() { return t("showChart"); },
      detail: title ? t("detailChartGenerated", { value1: truncate(title) }) : t("chartGenerated"),
    };
  }

  if (part.type === "tool-showDiagram") {
    return {
      get label() { return t("showDiagram"); },
      detail: title ? t("detailDiagramGenerated", { value1: truncate(title) }) : t("diagramGenerated"),
    };
  }

  if (part.type === "tool-showSvg") {
    const done = part.output !== undefined;
    return {
      get label() { return t("showImage"); },
      detail: done
        ? title
          ? t("detailImageGenerated", { value1: truncate(title) })
          : t("imageGenerated")
        : title
          ? t("detailGenerating", { value1: truncate(title) })
          : t("generatingImage"),
    };
  }

  return {
    get label() { return t("processContent"); },
    detail: part.output !== undefined ? t("stepCompleted") : t("processingRequest"),
  };
}
