import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/AppearanceEditorPreview.tsx#localMessages:1">`
zh-Hans:
  currentFolder_9db0: "📁 当前文件夹"
  wednesdayAfterTheRain_a77a: "雨停后的星期三"
  local_8e7e: "本地"
  wednesdayAfterTheRain_db18: "▤ 雨停后的星期三"
  projectPlan_271c: "▤ 项目计划"
  theRainHadJustStoppedAs_7743: "傍晚下班时，雨刚好停了。街角的面包店还亮着灯，我买了一只热乎的可颂，绕着小公园慢慢走回家。"
  theTreesCastLongShadowsUnder_e9d6: "路灯下的树影拉得很长，长椅上还留着细小的水珠"
  theCroissantWarmedItsPaperBag_bea6: "纸袋里的可颂带着热气，走到家门口还是酥的"
  afterDinnerIWateredTheMint_0f53: "晚饭后给阳台的薄荷浇了水，新叶已经冒出来。窗外吹进一点凉风，屋里只开一盏台灯，读了几页搁置已久的书。"
  reminders_1062: "提醒事项"
  callMomAndAskHowShe_eca4: "给妈妈打个电话，问问她最近睡得好不好"
  sortThePhotosFromMyWalk_a34c: "把散步时拍的照片整理进相册"
  thereIsNoNeedToFill_a850: "“日子不必安排得太满。留一点空白，才有时间看看窗外的云。”"
  serifPreviewALittleRoomTo_3bc8: "衬线体示例 · A little room to breathe."
  visitTheFlowerMarket_1874: '"逛花市"'
  buyCoffeeBeans_bc59: '"买咖啡豆"'
  aFewPlansForTheWeekend_b122: "周末的小计划"
  ifTheWeatherIsNiceI_cd40: "如果天气好，周六早晨去花市挑一盆迷迭香。回程买些咖啡豆，下午就在家煮一杯，慢慢整理上个月的照片。"
  iWouldAlsoLikeAnUnhurried_1117: "也想给自己留一段不赶时间的午后：翻到书签夹着的那一页，读完它，再把喜欢的句子记下来。"
  liveEditorPreview_d9e9: "编辑器即时预览"
en:
  currentFolder_9db0: "📁 Current folder"
  wednesdayAfterTheRain_a77a: "Wednesday After the Rain"
  local_8e7e: "Local"
  wednesdayAfterTheRain_db18: "▤ Wednesday After the Rain"
  projectPlan_271c: "▤ Project Plan"
  theRainHadJustStoppedAs_7743: "The rain had just stopped as I left work. The bakery on the corner was still open, so I bought a warm croissant and took the long way home through the park."
  theTreesCastLongShadowsUnder_e9d6: "The trees cast long shadows under the streetlights, and tiny drops of water still clung to the benches"
  theCroissantWarmedItsPaperBag_bea6: "The croissant warmed its paper bag and was still crisp when I reached my door"
  afterDinnerIWateredTheMint_0f53: "After dinner I watered the mint on the balcony. New leaves were already coming through. A cool breeze drifted in as I read a few pages of a book I had put aside, with just a desk lamp on."
  reminders_1062: "Reminders"
  callMomAndAskHowShe_eca4: "Call Mom and ask how she has been sleeping"
  sortThePhotosFromMyWalk_a34c: "Sort the photos from my walk into an album"
  thereIsNoNeedToFill_a850: "“There is no need to fill every moment. Leave a little room to look at the clouds.”"
  serifPreviewALittleRoomTo_3bc8: "Serif preview · A little room to breathe."
  visitTheFlowerMarket_1874: '"Visit the flower market"'
  buyCoffeeBeans_bc59: '"Buy coffee beans"'
  aFewPlansForTheWeekend_b122: "A Few Plans for the Weekend"
  ifTheWeatherIsNiceI_cd40: "If the weather is nice, I will pick up a rosemary plant at the flower market on Saturday morning. Coffee beans on the way home, then a quiet afternoon with a fresh cup and last month’s photos to sort."
  iWouldAlsoLikeAnUnhurried_1117: "I would also like an unhurried afternoon: return to my bookmark, finish the page, and write down a few favorite lines."
  liveEditorPreview_d9e9: "Live editor preview"
ja:
  currentFolder_9db0: "📁 現在のフォルダ"
  wednesdayAfterTheRain_a77a: "雨上がりの水曜日"
  local_8e7e: "ローカル"
  wednesdayAfterTheRain_db18: "▤ 雨上がりの水曜日"
  projectPlan_271c: "▤ プロジェクト計画"
  theRainHadJustStoppedAs_7743: "夕方、仕事を終えるころに雨がちょうど上がった。街角のパン屋はまだ明かりがついていて、焼きたてのクロワッサンを買い、小さな公園をのんびり歩いて帰った。"
  theTreesCastLongShadowsUnder_e9d6: "街灯の下で木々の影が長く伸び、ベンチにはまだ小さな水滴が残っていた"
  theCroissantWarmedItsPaperBag_bea6: "紙袋の中のクロワッサンは温かく、家の前に着いてもサクサクのままだった"
  afterDinnerIWateredTheMint_0f53: "夕食のあと、ベランダのミントに水をやった。新しい葉がもう顔を出している。窓から涼しい風が入り、部屋の明かりはデスクランプだけ。長く置いたままだった本を数ページ読んだ。"
  reminders_1062: "リマインダー"
  callMomAndAskHowShe_eca4: "母に電話して、最近よく眠れているか聞く"
  sortThePhotosFromMyWalk_a34c: "散歩で撮った写真をアルバムに整理する"
  thereIsNoNeedToFill_a850: "「毎日を詰め込みすぎなくていい。少し余白を残せば、窓の外の雲を眺める時間ができる。」"
  serifPreviewALittleRoomTo_3bc8: "明朝体のサンプル · A little room to breathe."
  visitTheFlowerMarket_1874: "「花市場に行く」"
  buyCoffeeBeans_bc59: "「コーヒー豆を買う」"
  aFewPlansForTheWeekend_b122: "週末のささやかな予定"
  ifTheWeatherIsNiceI_cd40: "天気がよければ、土曜の朝は花市場でローズマリーの鉢を選ぶ。帰りにコーヒー豆を買って、午後は家で一杯淹れながら、先月の写真をゆっくり整理しよう。"
  iWouldAlsoLikeAnUnhurried_1117: "時間に追われない午後も過ごしたい。しおりを挟んだページを開いて読み終え、気に入った一節を書き留める。"
  liveEditorPreview_d9e9: "エディタのライブプレビュー"
`;
const uiText = createTranslator(localMessages);
import { computeUiFontSize, computeSidebarFontSize } from "@/lib/appearance";
import type { UIFontSize } from "@/stores/settings/types";
import { useSettings } from "@/stores/useSettings";

interface Props {
  editorFontSize: number;
  editorLineHeight: number;
  uiFontSize: UIFontSize;
  showDemoEnglish?: boolean;
  editorOnly?: boolean;
}

function EditorSample({
  editorFontSize,
  editorLineHeight,
  uiFontSize,
  showDemoEnglish = true,
  editorOnly = false,
}: Props) {
  useLocale();
  const layout = useSettings((state) => state.defaultPageLayout);
  return (
    <div
      data-page-layout={layout}
      className="flex h-full w-full flex-col overflow-hidden text-foreground"
      style={{ background: "var(--goose-editor-surface)" }}
    >
      {!editorOnly && <div
        className="flex h-11 shrink-0 items-center gap-3 border-b border-border/70 px-4"
        style={{
          background: "var(--goose-shell-surface)",
          fontFamily: "var(--font-ui)",
          fontSize: computeUiFontSize(uiFontSize),
        }}
      >
        <span className="font-semibold">{uiText("currentFolder_9db0")}</span>
        <span className="text-muted-foreground">/</span>
        <span>{uiText("wednesdayAfterTheRain_a77a")}</span>
        <span className="ml-auto text-muted-foreground">•••</span>
      </div>}
      <div className="flex min-h-0 flex-1">
        {!editorOnly && <div
          className="appearance-preview-sidebar w-44 shrink-0 border-r border-border/70 p-3"
          style={{
            background: "var(--goose-shell-surface)",
            fontFamily: "var(--font-ui)",
            fontSize: computeSidebarFontSize(uiFontSize),
          }}
        >
          <p className="mb-5 truncate font-semibold">{uiText("local_8e7e")}</p>
          <p className="truncate rounded-lg bg-[var(--goose-interactive-selected)] px-2 py-1.5 text-[var(--goose-interactive-selected-fg)]">
            {uiText("wednesdayAfterTheRain_db18")}</p>
          <p className="mt-2 truncate px-2">{uiText("projectPlan_271c")}</p>
        </div>}
        <div className="page-layout-body flex min-w-0 flex-1">
          <div className="appearance-preview-editor min-w-0 flex-1 overflow-y-auto">
            <div
              className="page-layout-document"
              style={{
                fontFamily: "var(--font-default)",
                fontSize: editorFontSize,
                lineHeight: editorLineHeight,
                letterSpacing: "normal",
                WebkitFontSmoothing: "auto",
              }}
            >
              <h3 className="mb-[var(--page-title-gap)] text-[2em] leading-[1.6] tracking-[-0.5px]" style={{ fontWeight: 650 }}>
                {uiText("wednesdayAfterTheRain_a77a")}</h3>
              <p className="mb-[var(--page-paragraph-gap)]">
                {uiText("theRainHadJustStoppedAs_7743")}</p>
              <ul className="mb-3 list-disc pl-6">
                <li>{uiText("theTreesCastLongShadowsUnder_e9d6")}</li>
                <li>{uiText("theCroissantWarmedItsPaperBag_bea6")}</li>
              </ul>
              <p className="mb-[var(--page-paragraph-gap)]">
                {uiText("afterDinnerIWateredTheMint_0f53")}</p>
              <ul aria-label={uiText("reminders_1062")} className="mb-3 list-none space-y-1 pl-0">
                <li className="flex items-start gap-2">
                  <span className="flex h-[1lh] shrink-0 items-center">
                    <span aria-hidden="true" className="size-4 rounded border border-current" />
                  </span>
                  {uiText("callMomAndAskHowShe_eca4")}</li>
                <li className="flex items-start gap-2">
                  <span className="flex h-[1lh] shrink-0 items-center">
                    <span aria-hidden="true" className="size-4 rounded border border-current" />
                  </span>
                  {uiText("sortThePhotosFromMyWalk_a34c")}</li>
              </ul>
              <blockquote
                className="my-[30px] border-l-2 border-muted-foreground py-[3px] pl-[20px] text-[calc(18em/17)] text-muted-foreground"
              >
                {uiText("thereIsNoNeedToFill_a850")}</blockquote>
              {showDemoEnglish && (
                <p className="mb-2" style={{ fontFamily: "var(--font-serif)" }}>
                  {uiText("serifPreviewALittleRoomTo_3bc8")}</p>
              )}
              <div className="goose-code-block-node">
                <div className="goose-code-content-wrapper !pt-0">
                  <pre className="goose-code-pre">
                    <code>
                      <span className="hljs-keyword">const</span>{" "}
                      <span className="hljs-variable">weekend</span> = [
                      <span className="hljs-string">{uiText("visitTheFlowerMarket_1874")}</span>,{" "}
                      <span className="hljs-string">{uiText("buyCoffeeBeans_bc59")}</span>];
                    </code>
                  </pre>
                </div>
              </div>
              <h4 className="mt-[var(--page-title-gap)] mb-[14px] text-[calc(21em/17)] leading-[1.6] font-semibold tracking-[-0.25px]">{uiText("aFewPlansForTheWeekend_b122")}</h4>
              <p className="mb-[var(--page-paragraph-gap)]">
                {uiText("ifTheWeatherIsNiceI_cd40")}</p>
              <p>
                {uiText("iWouldAlsoLikeAnUnhurried_1117")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppearanceEditorPreview(props: Props) {
  useLocale();
  return (
    <section
      aria-label={uiText("liveEditorPreview_d9e9")}
      data-editor-preview
      className={props.editorOnly
        ? "min-w-0 overflow-hidden rounded-lg"
        : "min-w-0 overflow-hidden rounded-lg border border-border/70 shadow-sm"}
    >
      <EditorSample {...props} />
    </section>
  );
}
