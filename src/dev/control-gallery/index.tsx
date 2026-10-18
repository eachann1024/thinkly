import * as React from "react";
import { useSettings, ACCENT_COLORS, type Theme, type AccentColor } from "@/stores/useSettings";
import { Select as NativeSelect } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { GalleryForms } from "./forms";
import { GalleryMenus } from "./menus";
import { GalleryComposer } from "./composer";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";

export function ControlGallery() {
  const settings = useSettings();
  useResolvedTheme(settings.theme);
  return <main className="h-screen overflow-auto bg-background p-6 text-foreground">
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="space-y-2"><h1 className="text-xl font-semibold">公共控件样本</h1>
        <p className="text-sm text-muted-foreground">使用真实鼠标和键盘观察 hover、按下、焦点及复合状态。菜单先选第一行，再移到第二行查看高亮留白。</p>
        <p className="text-xs text-muted-foreground">主题、强调色和界面缩放使用应用设置并持久化；这不是业务流程验收。</p>
      </header>
      <section className="grid gap-4 sm:grid-cols-3" aria-label="真实外观设置">
        <Field label="主题"><NativeSelect value={settings.theme} onChange={e => settings.setTheme(e.target.value as Theme)}>
          <option value="light">浅色</option><option value="dark">深色</option><option value="system">跟随系统</option>
        </NativeSelect></Field>
        <Field label="强调色"><NativeSelect value={settings.accentColor} onChange={e => settings.setAccentColor(e.target.value as AccentColor)}>
          {ACCENT_COLORS.map(color => <option key={color} value={color}>{color}</option>)}
        </NativeSelect></Field>
        <Field label="界面缩放"><NativeSelect value={settings.uiFontSize} onChange={e => settings.setUIFontSize(Number(e.target.value))}>
          {[85, 100, 114, 130].map(size => <option key={size} value={size}>{size}%</option>)}
        </NativeSelect></Field>
      </section>
      <GalleryComposer /><GalleryForms /><GalleryMenus />
    </div>
  </main>;
}
