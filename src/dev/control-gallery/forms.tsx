import * as React from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Radio } from "@/components/ui/radio";
import { Switch } from "@/components/ui/switch";
import { Range } from "@/components/ui/range";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select as NativeSelect } from "@/components/ui/select";

export function GalleryForms() {
  const [checked, setChecked] = React.useState(true);
  const [range, setRange] = React.useState(50);
  const [tab, setTab] = React.useState("normal");
  const [segment, setSegment] = React.useState("standard");
  const [actions, setActions] = React.useState(0);
  return <section className="space-y-5" aria-labelledby="gallery-forms">
    <h2 id="gallery-forms" className="text-lg font-semibold">按钮与字段</h2>
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={() => setActions(n => n + 1)}>执行 {actions}</Button>
      <Button variant="outline">描边</Button><Button variant="ghost">透明</Button>
      <Button variant="destructive">危险操作</Button><Button busy>处理中</Button>
      <Button disabled>禁用</Button><Button disabled busy>忙碌且禁用</Button>
      <IconButton aria-label="选中动作" active onClick={() => setChecked(!checked)}>✓</IconButton>
      <IconButton aria-label="禁用动作" disabled>×</IconButton>
      <Button size="sm">紧凑</Button><Button context="editor" size="sm">编辑器适配</Button>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="普通输入" description="可输入、选择和复制"><Input placeholder="输入内容" /></Field>
      <Field label="错误输入" error="请填写有效地址"><Input defaultValue="无效地址" /></Field>
      <Field label="只读输入"><Input readOnly value="可选择复制的内容" /></Field>
      <Field label="禁用输入"><Input disabled value="当前不可操作" /></Field>
      <Field label="多行文本"><Textarea placeholder="输入多行内容" /></Field>
      <Field label="原生选择"><NativeSelect defaultValue="normal"><option value="normal">默认</option><option value="long">较长的选项文字</option><option disabled>禁用选项</option></NativeSelect></Field>
      <Field label={`范围：${range}`}><Range min={0} max={100} value={range} onChange={e => setRange(Number(e.target.value))} /></Field>
      <Field label="禁用范围"><Range disabled defaultValue={40} /></Field>
    </div>
    <div className="flex flex-wrap items-center gap-5">
      <Checkbox isSelected={checked} onChange={setChecked}><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Content>复选框</Checkbox.Content></Checkbox>
      <Checkbox isIndeterminate><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Content>部分选中</Checkbox.Content></Checkbox>
      <Checkbox isDisabled isSelected><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Content>禁用且选中</Checkbox.Content></Checkbox>
      <label className="flex items-center gap-2"><Switch checked={checked} onCheckedChange={setChecked} />开关</label>
      <label className="flex items-center gap-2"><Switch checked disabled />禁用开关</label>
      <label className="flex items-center gap-2"><Radio name="gallery-radio" defaultChecked />单选一</label>
      <label className="flex items-center gap-2"><Radio name="gallery-radio" />单选二</label>
      <label className="flex items-center gap-2"><Radio disabled />禁用单选</label>
    </div>
    <div><h3 className="mb-2 text-sm font-medium">公共 Tabs</h3>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="样本状态"><TabsTrigger value="normal">常规</TabsTrigger><TabsTrigger value="selected">选中</TabsTrigger><TabsTrigger value="disabled" disabled>禁用</TabsTrigger></TabsList>
        <TabsContent value="normal" className="mt-3 text-sm">当前标签：常规</TabsContent>
        <TabsContent value="selected" className="mt-3 text-sm">当前标签：选中</TabsContent>
      </Tabs>
    </div>
    <div><h3 className="mb-2 text-sm font-medium">公共分段选择</h3>
      <SegmentedControl aria-label="布局选择" value={segment} onValueChange={setSegment} options={[{ value: "standard", label: "标准" }, { value: "compact", label: "紧凑" }, { value: "disabled", label: "禁用", disabled: true }]} />
    </div>
  </section>;
}
