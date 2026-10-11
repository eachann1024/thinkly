import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuSeparator, ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent } from "@/components/ui/context-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function GalleryMenus() {
  const [choice, setChoice] = React.useState("first");
  const [scope, setScope] = React.useState("all");
  const [message, setMessage] = React.useState("尚未执行菜单动作");
  return <section className="space-y-4" aria-labelledby="gallery-menus">
    <h2 id="gallery-menus" className="text-lg font-semibold">菜单与浮层</h2>
    <div className="flex flex-wrap gap-4">
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline">多组下拉：{choice}</Button></DropdownMenuTrigger>
        <DropdownMenuContent><DropdownMenuRadioGroup value={choice} onValueChange={setChoice}>
          <DropdownMenuRadioItem value="first">第一行（选中）</DropdownMenuRadioItem><DropdownMenuRadioItem value="second">第二行（移入观察）</DropdownMenuRadioItem><DropdownMenuRadioItem value="disabled" disabled>禁用项</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup><DropdownMenuSeparator /><DropdownMenuRadioGroup value={scope} onValueChange={setScope}>
          <DropdownMenuRadioItem value="all">全部范围</DropdownMenuRadioItem><DropdownMenuRadioItem value="current">当前范围</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup><DropdownMenuSeparator /><DropdownMenuItem onClick={() => setMessage("已执行普通菜单动作")}>普通动作</DropdownMenuItem></DropdownMenuContent>
      </DropdownMenu>
      <ContextMenu><ContextMenuTrigger asChild><Button variant="outline">右键或 Shift+F10</Button></ContextMenuTrigger>
        <ContextMenuContent><ContextMenuGroup><ContextMenuItem onSelect={() => setMessage("已执行右键菜单第一行")}>第一行动作</ContextMenuItem><ContextMenuItem>第二行动作</ContextMenuItem><ContextMenuItem disabled>禁用动作</ContextMenuItem></ContextMenuGroup>
          <ContextMenuSeparator /><ContextMenuGroup><ContextMenuSub><ContextMenuSubTrigger>嵌套子菜单</ContextMenuSubTrigger><ContextMenuSubContent><ContextMenuGroup><ContextMenuItem>子项一</ContextMenuItem><ContextMenuItem>子项二</ContextMenuItem></ContextMenuGroup></ContextMenuSubContent></ContextMenuSub></ContextMenuGroup>
        </ContextMenuContent>
      </ContextMenu>
      <Popover><PopoverTrigger asChild><Button variant="outline">打开 Popover</Button></PopoverTrigger><PopoverContent><div className="space-y-3"><p className="text-sm">公共浮层里的字段</p><Input aria-label="浮层输入" placeholder="键盘焦点" /><Button size="sm" onClick={() => setMessage("已执行浮层动作")}>执行</Button></div></PopoverContent></Popover>
      <Dialog><DialogTrigger asChild><Button variant="outline">打开 Dialog</Button></DialogTrigger><DialogContent><DialogTitle>真实模态对话框</DialogTitle><DialogDescription>观察 Escape、焦点约束及关闭后的焦点恢复。</DialogDescription><Input aria-label="对话框输入" placeholder="输入内容" /><Button onClick={() => setMessage("已执行对话框动作")}>执行动作</Button></DialogContent></Dialog>
    </div>
    <p role="status" className="text-sm text-muted-foreground">{message}</p>
  </section>;
}
