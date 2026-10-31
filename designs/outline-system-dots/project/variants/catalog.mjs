import { path, poly, line, dot, circle, rect, paper, folder, alert, question, ink, signal } from "./geometry.mjs";

const variant = (letter, name, groups, note) => ({ letter, name, groups, note });
const soft = { alpha: .32 };
const blue = { tone: "accent", alpha: 1 };
const tiny = { width: .95, gap: 1.8, alpha: .78 };
const tinyPlus = (x, y, pitch = 2.6) => [[0,0],[-pitch,0],[pitch,0],[0,-pitch],[0,pitch]].map(([dx,dy]) => dot(x+dx,y+dy,.58));

export const catalog = [
  {
    key: "NoFolder", title: "未关联本地文件夹", copy: "请先关联本地文件夹", oldFile: "NoFolderReview", native: [216,150],
    variants: [
      variant("A", "文件夹与待接点", [
        ink(folder(14,23,76,56,true)),
        ink([line(97,44,110,44,soft), line(97,65,110,65,soft)], "sway", 3),
        signal([circle(112,55,5,{ ...blue, width: 2.4, gap: 4.2 }), dot(100,55,1.25)]),
      ], "文件夹和连接端之间保持间隙，不演示关联成功。"),
      variant("B", "本机与文件夹", [
        ink([rect(8,17,45,49), line(20,75,42,75), line(31,66,31,74)]),
        ink(folder(79,32,42,40)),
        signal([line(59,44,64,44,blue), line(70,44,74,44,blue)], 2),
        ink([line(58,55,73,55,soft)], "breathe", 7),
      ], "两个独立对象与未闭合短线表达尚未关联。"),
      variant("C", "入口与承托线", [
        ink(folder(30,18,73,56,true)),
        ink(poly([[19,73],[19,84],[112,84],[112,73]],soft), "rise", 4),
        signal([dot(12,81,1.5), dot(19,81,1.5), dot(26,81,1.5)], 1),
      ], "开口文件夹停在入口轨迹上，蓝点往复微亮，不进入成功态。"),
    ],
  },
  {
    key: "Folder", title: "空文件夹", copy: "这个文件夹还是空的", oldFile: "FolderReview", native: [196,124],
    variants: [
      variant("A", "打开的空文件夹", [
        ink(folder(22,20,85,62,true)),
        signal([dot(33,36), dot(38,36), dot(43,36)], 1),
      ], "正面清楚留空，只有边缘蓝点循环微亮。"),
      variant("B", "正面空封套", [
        ink(folder(22,18,84,65)),
        ink(poly([[33,47],[33,73],[95,73],[95,47]],{alpha:.24}), "breathe", 4),
        signal([dot(96,35), dot(101,35)], 2),
      ], "内层是同一文件夹的空腔，不绘制文件、文字或删除符号。"),
      variant("C", "展开的前后片", [
        ink(poly([[28,44],[28,17],[54,17],[64,27],[111,27],[111,44]],soft)),
        ink(poly([[12,45],[103,45],[91,81],[25,81],[12,45]]), "rise", 2),
        signal([dot(35,37), dot(40,37), dot(45,37)], 4),
      ], "用前后片的留空说明容量为空，轻抬幅度不超过 1.2px。"),
    ],
  },
  {
    key: "Book", title: "未打开笔记", copy: "从一篇笔记开始", oldFile: "BookReview", native: [220,180],
    variants: [
      variant("A", "合上的笔记本", [
        ink([rect(31,8,65,80), line(43,12,43,84), line(34,83,92,83,soft)]),
        signal(poly([[75,11],[75,27],[81,23],[87,27],[87,11]],blue), 2),
      ], "笔记本闭合，循环强调书签，不暗示当前已打开文档。"),
      variant("B", "两页留白", [
        ink(path("M64 24Q43 10 11 18V78Q43 70 64 84Q87 70 118 78V18Q87 10 64 24V84")),
        ink(path("M17 83Q43 77 62 89M68 89Q88 77 113 83",soft)),
        signal([dot(90,79),dot(95,78),dot(100,78)], 4),
      ], "沿用笔记语义，但两页完全留白，蓝点只在页边循环。"),
      variant("C", "待开启的纸页", [
        ink(poly([[28,27],[28,85],[79,85]],soft)),
        ink(paper(39,10,57,70), "rise", 2),
        signal(poly([[88,74],[102,74],[102,61]],blue), 1),
      ], "空白折页与选择角，保持未选择笔记的状态。"),
    ],
  },
  {
    key: "NoteError", title: "笔记无法显示", copy: "正文暂时无法显示", oldFile: "NoteErrorReview", native: [136,84.073],
    variants: [
      variant("A", "纸页与外置警示", [
        ink(paper(30,8,55,77)),
        ink([line(42,37,76,37,soft), line(42,48,69,48,soft)]),
        signal(alert(103,72,12), 1, {period:12}),
      ], "完整纸页和外置红色警示，不画碎纸、删除或自动恢复。"),
      variant("B", "显示窗口", [
        ink([rect(9,15,110,67), line(14,29,114,29,soft)]),
        ink(paper(36,39,36,35,8)),
        signal([poly([[96,45],[111,70],[81,70],[96,45]],{tone:"danger",alpha:.85}), line(96,55,96,60,{tone:"danger"}), dot(96,65,1.4,{tone:"danger"})], 4, {period:12}),
      ], "把不可显示落在窗口和警示上，保留文档完整。"),
      variant("C", "笔记本与显示括线", [
        ink([rect(25,9,63,77),line(36,13,36,82)]),
        ink(poly([[99,19],[111,19],[111,47]],soft), "sway", 4),
        signal(alert(103,72,10), 6, {period:12}),
      ], "闭合笔记与显示边界同时出现，表达显示受阻而非文件损坏。"),
    ],
  },
  {
    key: "SplitMissing", title: "分屏笔记缺失", copy: "找不到这篇笔记", oldFile: "SplitMissingReview", native: [136,84.073],
    variants: [
      variant("A", "双栏与空位", [
        ink([rect(8,17,112,65),line(59,20,59,79,soft),rect(20,31,25,37,{alpha:.28})]),
        ink(poly([[77,31],[105,31],[105,68],[77,68],[77,31]],{alpha:.35})),
        signal(question(91,46,7), 1),
      ], "目标栏保留空位与问号，不断言笔记永久删除。"),
      variant("B", "独立页面与缺位框", [
        ink(paper(14,23,35,53,8,{alpha:.3})),
        ink([poly([[74,30],[74,20],[113,20],[113,31]]),poly([[74,67],[74,78],[113,78],[113,66]])],"breathe",3),
        signal(question(94,44,9), 4),
      ], "主体改为独立页面和四角缺位框，不增加恢复按钮暗示。"),
      variant("C", "目标分屏与引用线", [
        ink([rect(61,12,56,73),line(65,25,113,25,soft)]),
        ink([line(13,34,35,34,soft),poly([[13,52],[42,52],[42,44],[54,44]],soft),line(13,71,35,71,soft)]),
        signal(question(89,51,10), 2),
      ], "突出仍存在的分屏容器和未解析引用，保留关闭此格的原有语义。"),
    ],
  },
  {
    key: "Reflection", title: "回顾期间无编辑", copy: "这段时间没有编辑记录", oldFile: "ReflectionReview", native: [300,72], plane: [300,72],
    variants: [
      variant("A", "空白时间区间", [
        ink([line(42,35,259,35),line(42,22,42,48,soft),line(259,22,259,48,soft)],null,0,{origin:[150,36]}),
        signal([dot(145,35,1.8),dot(151,35,1.8),dot(157,35,1.8)],2,{origin:[150,36],period:12}),
      ], "始终是平线，不生成伪造活动柱或增长轨迹。"),
      variant("B", "日期与空白记录", [
        ink([rect(42,13,47,47),line(46,27,85,27),line(53,9,53,19),line(77,9,77,19)]),
        ink([line(108,42,258,42),line(108,32,108,52,soft),line(258,32,258,52,soft)]),
        signal([dot(60,45,1.6),dot(66,45,1.6),dot(72,45,1.6)],4,{period:12}),
      ], "空日历与平线对应所选日期区间，内部没有虚构日期。"),
      variant("C", "时钟与静默轨道", [
        ink([circle(66,36,22),line(103,36,259,36),line(259,26,259,46,soft)]),
        ink([line(100,47,174,47,{alpha:.22}),line(190,47,249,47,{alpha:.22})],"breathe",6),
        signal([dot(66,14,1.8),dot(66,20,1.6)],2,{period:12}),
      ], "不指定虚假时刻，时钟外缘蓝点持续微亮，记录轨道保持空。"),
    ],
  },
  {
    key: "SmallFolderPlus", title: "添加本地文件夹", copy: "暂无本地文件夹，请先在侧栏添加本地笔记本。", oldFile: "SmallFolderPlusReview", native: [22,22], plane: [22,22], small: true,
    variants: [
      variant("A", "独立加号", [
        ink([path("M2 17V5H8L10 7H18V11M2 17H11",tiny),line(3,9,16,9,{...tiny,alpha:.4})]),
        signal(tinyPlus(16.3,16),2,{origin:[11,11]}),
      ], "22px 轮廓文件夹，右下加号独立，不与边框粘连。"),
      variant("B", "打开的文件夹", [
        ink([path("M3 9V5H8L10 7H13M2 10H15L12 18H4L2 10",tiny)]),
        signal(tinyPlus(18,7),4,{origin:[11,11]}),
      ], "22px 开口文件夹与右上加号，背景属于提示块而非图标尺寸。"),
      variant("C", "内置加号", [
        ink([path("M2 16V5H8L10 7H19V18H2",tiny),line(3,9,18,9,{...tiny,alpha:.4})]),
        signal(tinyPlus(11,13.7),1,{origin:[11,11]}),
      ], "22px 正面文件夹与居中加号，保持提示图标而非可点击按钮。"),
    ],
  },
];
