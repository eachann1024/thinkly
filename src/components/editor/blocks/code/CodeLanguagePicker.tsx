import {
  useState,
  useMemo,
  useEffect,
  useLayoutEffect,
  useRef,
  useId,
  useCallback,
} from "react";
import { Button } from "@/components/editor/ui/button";
import { Input } from "@/components/editor/ui/input";
import { Check } from "@/components/ui/icons";
import {
  Popover,
  PopoverContent,
  PopoverAction,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  LANGUAGE_DISPLAY_NAMES,
  POPULAR_LANGUAGES,
} from "./codeBlockLanguages";
import {
  defaultLanguageHighlightIndex,
  moveLanguageHighlightIndex,
} from "./codeBlockLanguageNav";
import type { CodeBlockToolbarProps } from "./codeToolbarTypes";
import { useCodeLanguageFocus } from "./useCodeLanguageFocus";
import messages from "./CodeLanguagePicker.messages.yaml";
import { createTranslator } from "@/i18n";
const t = createTranslator(messages);


export function CodeLanguagePicker({
  language,
  onLanguageChange,
  editable,
  isMathOrMermaid,
  sourceMode = false,
  hasVisualPreview,
  displayLanguage,
  chipClass,
  chipActiveClass,
}: Pick<CodeBlockToolbarProps, "language" | "onLanguageChange" | "editable"> & {
  isMathOrMermaid: boolean;
  sourceMode?: boolean;
  hasVisualPreview: boolean;
  displayLanguage: string;
  chipClass: string;
  chipActiveClass: string;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const languageListId = useId();
  const menuFocus = useCodeLanguageFocus();

  const filteredLanguages = useMemo(() => {
    if (!search) return POPULAR_LANGUAGES;
    const lowerSearch = search.toLowerCase();
    const fuzzyMatch = (text: string) => {
      let si = 0,
        ti = 0;
      const lt = text.toLowerCase();
      while (si < lowerSearch.length && ti < lt.length) {
        if (lowerSearch[si] === lt[ti]) si++;
        ti++;
      }
      return si === lowerSearch.length;
    };
    return POPULAR_LANGUAGES.filter((lang) => {
      const displayName = LANGUAGE_DISPLAY_NAMES[lang] || lang;
      return fuzzyMatch(lang) || fuzzyMatch(displayName);
    }).sort((a, b) => {
      const aN = a.toLowerCase(),
        bN = b.toLowerCase();
      const aD = (LANGUAGE_DISPLAY_NAMES[a] || a).toLowerCase();
      const bD = (LANGUAGE_DISPLAY_NAMES[b] || b).toLowerCase();
      if (aN === lowerSearch) return -1;
      if (bN === lowerSearch) return 1;
      const aS = aN.startsWith(lowerSearch) || aD.startsWith(lowerSearch);
      const bS = bN.startsWith(lowerSearch) || bD.startsWith(lowerSearch);
      if (aS && !bS) return -1;
      if (!aS && bS) return 1;
      const aI = aN.includes(lowerSearch) || aD.includes(lowerSearch);
      const bI = bN.includes(lowerSearch) || bD.includes(lowerSearch);
      if (aI && !bI) return -1;
      if (!aI && bI) return 1;
      return 0;
    });
  }, [search]);

  const safeHighlightedIndex =
    filteredLanguages.length === 0
      ? 0
      : Math.min(highlightedIndex, filteredLanguages.length - 1);

  const selectLanguage = useCallback(
    (lang: string) => {
      onLanguageChange(lang);
      setIsOpen(false);
    },
    [onLanguageChange],
  );

  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      event.stopPropagation();
      if (event.nativeEvent.isComposing) return;

      const count = filteredLanguages.length;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (count === 0) return;
        const delta = event.key === "ArrowDown" ? 1 : -1;
        setHighlightedIndex((current) =>
          moveLanguageHighlightIndex(current, count, delta),
        );
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const lang = filteredLanguages[safeHighlightedIndex];
        if (lang) selectLanguage(lang);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
      }
    },
    [filteredLanguages, safeHighlightedIndex, selectLanguage],
  );

  useEffect(() => {
    if (isOpen) {
      const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(timer);
    }
    setSearch("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setHighlightedIndex(
      defaultLanguageHighlightIndex(filteredLanguages, search, language),
    );
  }, [isOpen, search, language, filteredLanguages]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    // Portal 可能在本轮 layout effect 之后挂载，下一帧再定位当前语言。
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(`${languageListId}-opt-${safeHighlightedIndex}`)
        ?.scrollIntoView({ block: "nearest" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, languageListId, safeHighlightedIndex]);

  return (
    <>
      {editable && (!isMathOrMermaid || sourceMode) ? (
        <Popover
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (open) {
              menuFocus.capture();
              setHighlightedIndex(
                defaultLanguageHighlightIndex(
                  filteredLanguages,
                  search,
                  language,
                ),
              );
            } else {
              setHighlightedIndex(0);
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              data-state={isOpen ? "open" : "closed"}
              variant="ghost"
              size="sm"
              className={cn(
                "goose-code-lang-trigger h-6 min-w-6 px-1.5 font-mono text-xs",
                chipClass,
                isOpen && chipActiveClass,
              )}
            >
              {displayLanguage}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            variant="menu"
            align="end"
            className="goose-code-language-picker"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              menuFocus.restore();
            }}
            onInteractOutside={() => menuFocus.cancel()}
          >
            <div className="goose-code-language-search">
              <Input
                ref={inputRef}
                role="combobox"
                aria-label={t("searchCodeLanguages")}
                aria-autocomplete="list"
                aria-expanded={isOpen}
                aria-controls={languageListId}
                aria-activedescendant={
                  filteredLanguages[safeHighlightedIndex]
                    ? `${languageListId}-opt-${safeHighlightedIndex}`
                    : undefined
                }
                placeholder={t("searchLanguages")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="goose-code-language-input"
              />
            </div>
            {!search && (
              <div className="goose-code-language-label goose-menu-label">{t("commonLanguages")}</div>
            )}
            <div
              id={languageListId}
              className="goose-code-language-list goose-list-layout"
              data-goose-menu-slot="root"
              role="listbox"
              aria-label={t("codeLanguage")}
            >
              {filteredLanguages.length === 0 ? (
                <div className="goose-code-language-empty">{t("noLanguagesFound")}</div>
              ) : null}
              {filteredLanguages.map((lang, index) => (
                <PopoverAction
                  key={lang}
                  id={`${languageListId}-opt-${index}`}
                  role="option"
                  data-goose-menu-slot="row"
                  data-keyboard-active={
                    index === safeHighlightedIndex || undefined
                  }
                  aria-selected={index === safeHighlightedIndex}
                  data-goose-selected={
                    lang.toLowerCase() === language.toLowerCase()
                  }
                  data-goose-lang-highlighted={
                    index === safeHighlightedIndex ? "true" : undefined
                  }
                  onPointerMove={(event) => {
                    event.preventDefault();
                    document.documentElement.dataset.goosePointerFocus = "true";
                    setHighlightedIndex(index);
                  }}
                  onSelect={() => {
                    selectLanguage(lang);
                  }}
                  className="goose-code-language-option goose-menu-item"
                >
                  <span className="goose-code-language-name">
                    {LANGUAGE_DISPLAY_NAMES[lang] || lang}
                  </span>
                  {lang.toLowerCase() === language.toLowerCase() && (
                    <Check
                      className="goose-code-language-check"
                      aria-hidden="true"
                    />
                  )}
                </PopoverAction>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        !hasVisualPreview && (
          <div className="inline-flex h-6 cursor-default items-center rounded-md bg-[var(--goose-block-subtle-bg)] px-1.5 font-mono text-[11px] text-muted-foreground">
            {displayLanguage}
          </div>
        )
      )}
    </>
  );
}
