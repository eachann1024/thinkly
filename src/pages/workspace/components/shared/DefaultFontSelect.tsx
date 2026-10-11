import { Label } from "@/components/ui/label";
import { LocalFontSelect } from "./LocalFontSelect";

export function DefaultFontSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="default-font-select space-y-3">
      <div className="flex flex-col gap-3">
        <Label htmlFor={id}>正文字体</Label>
        <LocalFontSelect
          id={id}
          label="正文字体"
          value={value}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
