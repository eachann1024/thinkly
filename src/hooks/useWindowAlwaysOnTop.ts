import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n/core";
const storeText = createTranslator(i18nYaml<"src/hooks/useWindowAlwaysOnTop.ts#block1:1">`
zh-Hans:
  readPinFailed: "无法读取窗口置顶状态，请重试"
  togglePinFailed: "窗口置顶切换失败，请重试"
en:
  readPinFailed: "Couldn’t read the window’s always-on-top setting. Please try again."
  togglePinFailed: "Couldn’t change the window’s always-on-top setting. Please try again."
ja:
  readPinFailed: "ウィンドウの最前面表示の状態を取得できませんでした。もう一度お試しください"
  togglePinFailed: "ウィンドウの最前面表示を切り替えられませんでした。もう一度お試しください"
`);
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getDesktopAlwaysOnTop,
  setDesktopAlwaysOnTop,
} from "@/lib/electron/alwaysOnTop";

/** 读取当前窗口的真实置顶状态；不写入全局设置或影响速记窗口。 */
export function useWindowAlwaysOnTop(): {
  alwaysOnTop: boolean;
  isPending: boolean;
  toggleAlwaysOnTop: () => Promise<void>;
} {
  useLocale();
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [isPending, setIsPending] = useState(true);
  const pendingRef = useRef(true);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    void getDesktopAlwaysOnTop().then((value) => {
      if (!cancelled) setAlwaysOnTop(value);
    }).catch(() => {
      if (!cancelled) toast.error(storeText("readPinFailed"));
    }).finally(() => {
      if (!cancelled) {
        pendingRef.current = false;
        setIsPending(false);
      }
    });
    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

  const toggleAlwaysOnTop = useCallback(async () => {
    if (pendingRef.current || !mountedRef.current) return;
    pendingRef.current = true;
    setIsPending(true);
    try {
      // 切换前再读一次，避免顶栏重挂载或宿主状态变化时反转旧值。
      const current = await getDesktopAlwaysOnTop();
      if (!mountedRef.current) return;
      setAlwaysOnTop(current);
      const next = await setDesktopAlwaysOnTop(!current);
      if (mountedRef.current) setAlwaysOnTop(next);
    } catch {
      if (mountedRef.current) toast.error(storeText("togglePinFailed"));
    } finally {
      pendingRef.current = false;
      if (mountedRef.current) setIsPending(false);
    }
  }, []);

  return { alwaysOnTop, isPending, toggleAlwaysOnTop };
}
