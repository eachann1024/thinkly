import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/SettingsFeedback.tsx#localMessages:1">`
zh-Hans:
  body_2c1e: "正文"
  bodyPlaceholder_4f2a: "描述问题或建议"
  replyEmail_7a10: "回复邮箱"
  replyEmailPlaceholder_8c19: "name@example.com"
  images_8d44: "图片"
  video_9b21: "视频"
  send_6e02: "发送"
  sending_1f90: "发送中"
  thanks_3c88: "感谢您的反馈"
  needBody_4aa1: "请填写正文"
  offline_5d12: "反馈服务没开"
  tooManyImages_0e77: "图片最多 1 张"
  imageTooBig_2b63: "图片不能超过 20MB"
  videoTooBig_91c4: "视频不能超过 200MB"
  removeFile_c0a8: "移除{{name}}"
en:
  body_2c1e: "Message"
  bodyPlaceholder_4f2a: "Describe an issue or suggestion"
  replyEmail_7a10: "Reply email"
  replyEmailPlaceholder_8c19: "name@example.com"
  images_8d44: "Images"
  video_9b21: "Video"
  send_6e02: "Send"
  sending_1f90: "Sending"
  thanks_3c88: "感谢您的反馈"
  needBody_4aa1: "Write a message first"
  offline_5d12: "Feedback service is not running"
  tooManyImages_0e77: "Up to 1 image"
  imageTooBig_2b63: "Each image must be 20MB or smaller"
  videoTooBig_91c4: "Video must be 200MB or smaller"
  removeFile_c0a8: "Remove {{name}}"
ja:
  body_2c1e: "本文"
  bodyPlaceholder_4f2a: "問題や提案を入力"
  replyEmail_7a10: "返信メール"
  replyEmailPlaceholder_8c19: "name@example.com"
  images_8d44: "画像"
  video_9b21: "動画"
  send_6e02: "送信"
  sending_1f90: "送信中"
  thanks_3c88: "感谢您的反馈"
  needBody_4aa1: "本文を入力してください"
  offline_5d12: "フィードバックサービスが起動していません"
  tooManyImages_0e77: "画像は 1 枚まで"
  imageTooBig_2b63: "画像は 20MB まで"
  videoTooBig_91c4: "動画は 200MB まで"
  removeFile_c0a8: "{{name}} を削除"
`;
const uiText = createTranslator(localMessages);
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { celebrate } from "@/lib/celebrate";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { GripTextarea, gripPaint } from "@/components/ui/grip-textarea";
import { fieldVariants } from "@/components/ui/control-recipes";
import { cn } from "@/lib/utils";

const endpoint = "https://feedback-api.cooool.top/api/feedback";
const imageLimit = 20 * 1024 * 1024;
const videoLimit = 200 * 1024 * 1024;

export function SettingsFeedback() {
  useLocale();
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [contact, setContact] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const onImages = (list: FileList | null) => {
    const file = list?.[0];
    if (!file) return;
    const next = [file];
    if (next.some((file) => file.size > imageLimit)) { setNotice(uiText("imageTooBig_2b63")); return; }
    setImages(next);
    setNotice("");
  };
  const onVideo = (list: FileList | null) => {
    const file = list?.[0];
    if (!file) return;
    if (file.size > videoLimit) { setNotice(uiText("videoTooBig_91c4")); return; }
    setVideo(file);
    setNotice("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = body.trim();
    if (!message) { setNotice(uiText("needBody_4aa1")); return; }
    const form = new FormData();
    form.set("project", "thinkly");
    form.set("message", message);
    if (contact.trim()) form.set("contact", contact.trim());
    form.set("leave_blank", "");
    for (const file of images) form.append("images", file);
    if (video) form.set("video", video);
    setBusy(true);
    try {
      const response = await fetch(endpoint, { method: "POST", body: form });
      const payload = await response.json().catch(() => null) as { error?: string; ok?: boolean } | null;
      if (!response.ok) { setNotice(payload?.error || uiText("offline_5d12")); return; }
      setBody("");
      setContact("");
      setImages([]);
      setVideo(null);
      setNotice("");
      toast.success("已收到");
      celebrate();
    } catch {
      setNotice(uiText("offline_5d12"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="grid max-w-xl gap-4" onSubmit={submit}>
      <Field label={uiText("body_2c1e")} required>
        <GripTextarea
          className={cn(fieldVariants(), "h-auto min-h-20")}
          paint={gripPaint.goose}
          gripLabel={uiText("body_2c1e")}
          minHeight={120}
          name="message"
          required
          maxLength={4000}
          value={body}
          placeholder={uiText("bodyPlaceholder_4f2a")}
          onChange={(event) => setBody(event.target.value)}
        />
      </Field>
      <Field label={uiText("replyEmail_7a10")}>
        <Input
          name="contact"
          type="email"
          value={contact}
          placeholder={uiText("replyEmailPlaceholder_8c19")}
          onChange={(event) => setContact(event.target.value)}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => imageRef.current?.click()}>
          {uiText("images_8d44")}{images.length ? ` ${images.length}` : ""}
        </Button>
        <Button type="button" variant="outline" onClick={() => videoRef.current?.click()}>
          {video ? video.name : uiText("video_9b21")}
        </Button>
      </div>
      <Input
        ref={imageRef}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
        aria-label={uiText("images_8d44")}
        onChange={(event) => { onImages(event.target.files); event.target.value = ""; }}
      />
      <Input
        ref={videoRef}
        className="sr-only"
        type="file"
        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
        aria-label={uiText("video_9b21")}
        onChange={(event) => { onVideo(event.target.files); event.target.value = ""; }}
      />
      <Input name="leave_blank" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {images.length || video ? (
        <div className="flex flex-wrap gap-2">
          {images.map((file) => (
            <Button key={`${file.name}-${file.size}`} type="button" variant="ghost" onClick={() => setImages(images.filter((item) => item !== file))}>
              {uiText("removeFile_c0a8", { name: file.name })}
            </Button>
          ))}
          {video ? (
            <Button type="button" variant="ghost" onClick={() => setVideo(null)}>
              {uiText("removeFile_c0a8", { name: video.name })}
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" busy={busy} disabled={busy}>{busy ? uiText("sending_1f90") : uiText("send_6e02")}</Button>
        <p aria-live="polite" className="text-sm">{notice}</p>
      </div>
    </form>
  );
}
