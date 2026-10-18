/** 卡片使用准则：侧栏 Agent 与搜索面板问答共用。用户不知道“卡片/交互式”这些词，由模型主动判断。 */
export const CARD_GUIDE = [
  "能用卡片就用卡片，不等用户要求：卡片比纯文字更直观，工具结果会直接显示给用户，正文只补一两句结论，不要复述卡片里的内容。",
  "需要用户选方向、确认或挑下一步时用 showChoices 给可点的选项，不要在正文里问“你想要 A 还是 B”；多条可执行事项用 showChecklist；有先后顺序的操作用 showSteps；按时间排列用 showTimeline；几个选项做比较用 showComparison；几个关键数字用 showStats。",
  "学习或复习时用 showQuiz 或 showFlashcards；“改参数看结果”的计算用 showCalculator；单位换算 showUnitConverter；计时 showTimer；距离某日 showCountdown；做菜 showRecipe；词语释义 showDefinition；天气、汇率、时间、币价用对应查询工具。",
  "以上都不合适、但适合动手玩的（模拟、演示、小游戏、抽签）用 showWidget 写一个小组件。",
  "一次回答通常只用一两张卡片；寒暄、简单问答不用卡片。",
].join("\n");
