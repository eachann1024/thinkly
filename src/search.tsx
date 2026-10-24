import { createTranslator, i18nYaml, subscribeLanguage } from "@/i18n/core";
const entryText = createTranslator(i18nYaml<"src/search.tsx#block1:1">`
zh-Hans:
  title: 搜索
en:
  title: Search
ja:
  title: "検索"
`);
const updateTitle = () => { document.title = entryText("title"); };
updateTitle();
subscribeLanguage(updateTitle);
import { bootstrap } from "./main";
import { SearchWindowApp } from "./pages/search-window/SearchWindowApp";

void bootstrap(() => <SearchWindowApp />, { mode: "search" });
