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
/**
 * 浮动搜索窗入口（全局搜索热键在应用不在前台时唤出，search.html → 本文件）。
 *
 * 复用主窗 bootstrap 的 search 模式：只读水合设置与笔记本，不迁移、不恢复、
 * 不安装 git / 资源清理应答、不做历史维护与后台备份；页面由搜索面板只读扫描本地文件夹。
 */
import { bootstrap } from "./main";
import { SearchWindowApp } from "./pages/search-window/SearchWindowApp";

void bootstrap(() => <SearchWindowApp />, { mode: "search" });
