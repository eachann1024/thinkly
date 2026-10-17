import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/ShortcutField.tsx#localMessages:1">`
zh-Hans:
  pressAShortcutEscToCancel_f78c: "按下快捷键，Esc 取消"
  clickThenPressAShortcut_b24f: "点击后按下快捷键"
  resetToDefaults_7468: "恢复默认"
  clear_288f: "清空"
en:
  pressAShortcutEscToCancel_f78c: "Press a shortcut; Esc to cancel"
  clickThenPressAShortcut_b24f: "Click, then press a shortcut"
  resetToDefaults_7468: "Reset to defaults"
  clear_288f: "Clear"
`;
const uiText = createTranslator(localMessages);
import { useRef, useState } from "react"
import * as GooseIcons from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { formatShortcut, getPlatformKind } from "@/lib/utils"
import { canonicalizeRecordedShortcut } from "@/lib/shortcut-platform"
import { getShortcutFromMouseEvent } from "@/lib/shortcut-match"

const SETTINGS_OPTION_ROW_CLASS =
  "goose-settings-option-row"

const MODIFIER_KEYS = new Set(["control", "ctrl", "meta", "alt", "shift", "super", "os", "win", "windows"])
const MODIFIER_ORDER = ["Ctrl", "Meta", "Alt", "Shift"]

function normalizeShortcutKey(rawKey: string) {
  if (rawKey === " ") return "Space"
  if (rawKey === "+") return "Plus"
  const key = rawKey.trim().toLowerCase()
  if (!key) return ""
  if (key === "control" || key === "ctrl") return "Ctrl"
  if (key === "meta" || key === "command" || key === "cmd" || key === "super" || key === "os" || key === "win" || key === "windows") return "Meta"
  if (key === "alt" || key === "option") return "Alt"
  if (key === "shift") return "Shift"
  if (key === "escape" || key === "esc") return "Esc"
  if (key.length === 1) return key.toUpperCase()
  return key.charAt(0).toUpperCase() + key.slice(1)
}

interface ShortcutInputEvent {
  key: string
  code?: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
  preventDefault: () => void
  stopPropagation: () => void
}

/** Extract the canonical main key from an event, using event.code as fallback
 *  when a modifier (especially Alt on Mac) causes event.key to be a non-ASCII
 *  composed character (e.g. ⌥C → "ç"). */
function resolveMainKey(event: ShortcutInputEvent): string {
  const hasModifier = event.ctrlKey || event.metaKey || event.altKey
  const isAsciiPrintable = event.key.length === 1 && event.key.codePointAt(0)! < 128
  if (hasModifier && !isAsciiPrintable && event.code) {
    // KeyX → X, Digit5 → 5, BracketLeft → [, etc.
    const code = event.code
    if (code.startsWith("Key")) return code.slice(3)
    if (code.startsWith("Digit")) return code.slice(5)
    if (code === "BracketLeft") return "["
    if (code === "BracketRight") return "]"
    return code
  }
  return event.key
}

export function getShortcutFromKeyEvent(event: ShortcutInputEvent) {
  const baseModifiers = [
    event.ctrlKey ? "Ctrl" : "",
    event.metaKey ? "Meta" : "",
    event.altKey ? "Alt" : "",
    event.shiftKey ? "Shift" : "",
  ].filter(Boolean)
  const normalizedKey = normalizeShortcutKey(resolveMainKey(event))
  const isModifierKey = MODIFIER_KEYS.has(event.key.toLowerCase())
  const hasKey = normalizedKey && !isModifierKey
  if (!hasKey) return ""
  const tokens = [...baseModifiers, normalizedKey]
  const ordered = MODIFIER_ORDER.filter((key) => tokens.includes(key))
  ordered.push(normalizedKey)
  return ordered.join("+")
}

export interface ShortcutFieldProps {
  id: string
  title: string
  description?: string
  value: string
  onChange: (shortcut: string) => void
  resetValue?: string
}

export function ShortcutField({
  id,
  title,
  description,
  value,
  onChange,
  resetValue,
}: ShortcutFieldProps) {
  useLocale();
  const [isCapturing, setIsCapturing] = useState(false)
  const pendingModifierRef = useRef("")
  const modifierUsedInChordRef = useRef(false)
  const displayValue = value ? formatShortcut(value) : ""
  const finishCapture = (input: HTMLInputElement) => {
    resetPendingModifier()
    setIsCapturing(false)
    input.blur()
  }
  const resetPendingModifier = () => {
    pendingModifierRef.current = ""
    modifierUsedInChordRef.current = false
  }

  return (
    <div className={`space-y-2 p-4 ${SETTINGS_OPTION_ROW_CLASS}`}>
      <div>
        <div className="flex items-center gap-3">
          <GooseIcons.Keyboard className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <Label htmlFor={id} className="cursor-pointer">
            {title}
          </Label>
        </div>
        {description ? (
          <p className="mt-1 pl-7 text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          value={displayValue}
          readOnly
          data-shortcut-recorder
          placeholder={isCapturing ? uiText("pressAShortcutEscToCancel_f78c") : uiText("clickThenPressAShortcut_b24f")}
          className={cn(
            "h-9 text-sm transition-colors",
            isCapturing && "placeholder:text-[var(--goose-color-capture-hint)]",
          )}
          onFocus={() => {
            resetPendingModifier()
            setIsCapturing(true)
          }}
          onBlur={() => {
            resetPendingModifier()
            setIsCapturing(false)
          }}
          onMouseDown={(event) => {
            const shortcut = getShortcutFromMouseEvent(event.nativeEvent)
            if (!shortcut) return
            event.preventDefault()
            event.stopPropagation()
            event.currentTarget.focus()
            setIsCapturing(true)
            onChange(canonicalizeRecordedShortcut(shortcut, getPlatformKind()))
            finishCapture(event.currentTarget)
          }}
          onAuxClick={(event) => {
            if (!getShortcutFromMouseEvent(event.nativeEvent)) return
            event.preventDefault()
            event.stopPropagation()
          }}
          onKeyDown={(event) => {
            if (
              event.key === "Tab" &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.altKey &&
              !event.shiftKey
            ) {
              return
            }

            if (
              event.key === "Escape" &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.altKey &&
              !event.shiftKey
            ) {
              event.preventDefault()
              event.stopPropagation()
              finishCapture(event.currentTarget)
              return
            }

            if (
              (event.key === "Backspace" || event.key === "Delete") &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.altKey &&
              !event.shiftKey
            ) {
              event.preventDefault()
              event.stopPropagation()
              onChange("")
              finishCapture(event.currentTarget)
              return
            }

            event.preventDefault()
            event.stopPropagation()

            const isModifierKey = MODIFIER_KEYS.has(event.key.toLowerCase())
            if (isModifierKey) {
              const modifier = normalizeShortcutKey(event.key)
              if (!pendingModifierRef.current) {
                pendingModifierRef.current = modifier
                modifierUsedInChordRef.current = false
              } else if (pendingModifierRef.current !== modifier) {
                modifierUsedInChordRef.current = true
              }
              return
            }

            if (pendingModifierRef.current) {
              modifierUsedInChordRef.current = true
            }
            const shortcut = getShortcutFromKeyEvent(event)
            if (shortcut) {
              onChange(canonicalizeRecordedShortcut(shortcut, getPlatformKind()))
              finishCapture(event.currentTarget)
            }
          }}
          onKeyUp={(event) => {
            if (!MODIFIER_KEYS.has(event.key.toLowerCase())) return
            event.preventDefault()
            event.stopPropagation()

            const modifier = normalizeShortcutKey(event.key)
            if (
              pendingModifierRef.current === modifier &&
              !modifierUsedInChordRef.current
            ) {
              onChange(canonicalizeRecordedShortcut(modifier, getPlatformKind()))
              finishCapture(event.currentTarget)
            }
            if (pendingModifierRef.current === modifier) {
              resetPendingModifier()
            }
          }}
        />
        {resetValue !== undefined && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 rounded-[var(--goose-control-radius)]"
            onClick={() => onChange(resetValue)}
          >
            {uiText("resetToDefaults_7468")}</Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 shrink-0 rounded-[var(--goose-control-radius)]"
          onClick={() => onChange("")}
        >
          {uiText("clear_288f")}</Button>
      </div>
    </div>
  )
}
