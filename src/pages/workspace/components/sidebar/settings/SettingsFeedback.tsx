import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/SettingsFeedback.tsx#localMessages:1">`
zh-Hans:
  body_2c1e: "正文"
  replyEmail_7a10: "回复邮箱"
  images_8d44: "图片"
  video_9b21: "视频"
  send_6e02: "发送"
  sending_1f90: "发送中"
  thanks_3c88: "感谢您的反馈"
  needBody_4aa1: "请填写正文"
  offline_5d12: "反馈服务没开"
  tooManyImages_0e77: "图片最多 1 张"
  imageTooBig_2b63: "图片不能超过 8MB"
  videoTooBig_91c4: "视频不能超过 15MB"
  removeFile_c0a8: "移除{{name}}"
en:
  body_2c1e: "Message"
  replyEmail_7a10: "Reply email"
  images_8d44: "Images"
  video_9b21: "Video"
  send_6e02: "Send"
  sending_1f90: "Sending"
  thanks_3c88: "感谢您的反馈"
  needBody_4aa1: "Write a message first"
  offline_5d12: "Feedback service is not running"
  tooManyImages_0e77: "Up to 1 image"
  imageTooBig_2b63: "Each image must be 8MB or smaller"
  videoTooBig_91c4: "Video must be 15MB or smaller"
  removeFile_c0a8: "Remove {{name}}"
ja:
  body_2c1e: "本文"
  replyEmail_7a10: "返信メール"
  images_8d44: "画像"
  video_9b21: "動画"
  send_6e02: "送信"
  sending_1f90: "送信中"
  thanks_3c88: "感谢您的反馈"
  needBody_4aa1: "本文を入力してください"
  offline_5d12: "フィードバックサービスが起動していません"
  tooManyImages_0e77: "画像は 1 枚まで"
  imageTooBig_2b63: "画像は 8MB まで"
  videoTooBig_91c4: "動画は 15MB まで"
  removeFile_c0a8: "{{name}} を削除"
`;
const uiText = createTranslator(localMessages);
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

const endpoint = "http://127.0.0.1:8787/api/feedback";
const imageLimit = 8 * 1024 * 1024;
const videoLimit = 15 * 1024 * 1024;

function UploadMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V6" />
      <path d="M8 9.5 12 5.5 16 9.5" />
      <path d="M5 16.5v1.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1.5" />
    </svg>
  );
}

export function SettingsFeedback() {
  useLocale();
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
    form.set("message", message);
    if (contact.trim()) form.set("contact", contact.trim());
    form.set("company", "");
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
      setNotice(uiText("thanks_3c88"));
    } catch {
      setNotice(uiText("offline_5d12"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="grid max-w-xl gap-4" onSubmit={submit}>
      <label className="grid gap-2 text-sm">
        {uiText("body_2c1e")}
        <textarea
          name="message"
          required
          rows={6}
          maxLength={4000}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </label>
      <label className="grid gap-2 text-sm">
        {uiText("replyEmail_7a10")}
        <input
          name="contact"
          type="email"
          value={contact}
          onChange={(event) => setContact(event.target.value)}
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
        />
      </label>
      <div className="feedback-picks">
        <label className="feedback-pick">
          <UploadMark />
          <span>{uiText("images_8d44")}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif" onChange={(event) => { onImages(event.target.files); event.target.value = ""; }} />
        </label>
        <label className="feedback-pick">
          <UploadMark />
          <span>{uiText("video_9b21")}</span>
          <input type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" onChange={(event) => { onVideo(event.target.files); event.target.value = ""; }} />
        </label>
      </div>
      <input name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      {images.length || video ? (
        <ul className="grid gap-1 text-sm text-muted-foreground">
          {images.map((file) => (
            <li key={`${file.name}-${file.size}`}>
              <button type="button" onClick={() => setImages(images.filter((item) => item !== file))}>{uiText("removeFile_c0a8", { name: file.name })}</button>
            </li>
          ))}
          {video ? <li><button type="button" onClick={() => setVideo(null)}>{uiText("removeFile_c0a8", { name: video.name })}</button></li> : null}
        </ul>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>{busy ? uiText("sending_1f90") : uiText("send_6e02")}</Button>
        <p aria-live="polite" className="text-sm">{notice}</p>
      </div>
    </form>
  );
}
