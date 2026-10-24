import { useEffect, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { DOT_MOTION_INITIAL, useDotMotion } from "../useDotMotion";
import { cachedSprite, renderSprite, type SpriteSource } from "./ditherSprite";
import {
  CHARACTER_FULL_CROP,
  CHARACTER_HEAD_CROP,
  findCharacter,
  type CharacterDef,
  type CharacterPose,
  type CharacterRect,
  type CharacterTone,
} from "./registry";
import { useDarkTheme } from "./useDarkTheme";
import { useDevicePixelRatio } from "./useDevicePixelRatio";
import "./character-sprite.css";

export type CharacterCrop = "full" | "head";

const pct = (value: number) => `${(Math.min(1, Math.max(0, value)) * 100).toFixed(2)}%`;

function eyeInCrop(eye: CharacterRect, crop: CharacterRect) {
  const pad = 0.012;
  const x = (eye[0] - pad - crop[0]) / crop[2];
  const y = (eye[1] - pad - crop[1]) / crop[3];
  const w = (eye[2] + pad * 2) / crop[2];
  const h = (eye[3] + pad * 2) / crop[3];
  if (x < 0 || y < 0 || x + w > 1 || y + h > 1) return null;
  const [l, t, r, b] = [pct(x), pct(y), pct(x + w), pct(y + h)];
  return {
    eye: `inset(${t} ${pct(1 - x - w)} ${pct(1 - y - h)} ${l})`,
    rest: `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${l} ${t}, ${r} ${t}, ${r} ${b}, ${l} ${b}, ${l} ${t})`,
  };
}

function spriteJob(
  character: CharacterDef,
  pose: CharacterPose,
  tone: CharacterTone,
  crop: CharacterCrop,
  box: CharacterRect,
  size: number,
  dpr: number,
): { key: string; load: () => Promise<string>; source: SpriteSource } {
  const gray = character.gray[`${pose}-${crop}`];
  if (gray) {
    const px = Math.round(size * dpr);
    return { key: `${character.id}-${pose}-${tone}:g${px}:${crop}`, load: gray, source: { kind: "gray", px, dark: tone === "dark" } };
  }
  const cols = Math.round(size * dpr);
  return {
    key: `${character.id}-${pose}-${tone}:${cols}:${crop}`,
    load: character.assets[pose][tone],
    source: { kind: "bits", cols, crop: box },
  };
}

export function CharacterSprite({
  id,
  pose = "main",
  size,
  crop = "full",
  still = false,
  className,
  style,
}: {
  id: string;
  pose?: CharacterPose;
  size: number;
  crop?: CharacterCrop;
  still?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useDotMotion<HTMLDivElement>();
  const dark = useDarkTheme();
  const character = findCharacter(id);
  const tone = dark ? "dark" : "light";
  const box = crop === "head" ? CHARACTER_HEAD_CROP : CHARACTER_FULL_CROP;
  const dpr = useDevicePixelRatio();
  const blinkable = !still && pose === "main" && Boolean(character);
  const base = character ? spriteJob(character, pose, tone, crop, box, size, dpr) : null;
  const shutJob = character && blinkable ? spriteJob(character, "blink", tone, crop, box, size, dpr) : null;
  const baseKey = base?.key ?? "";
  const shutKey = shutJob?.key ?? "";
  const [, setLoaded] = useState(0);

  useEffect(() => {
    if (!base) return;
    let alive = true;
    const done = () => alive && setLoaded((n) => n + 1);
    void renderSprite(base.key, base.load, base.source).then(done, () => undefined);
    if (shutJob) void renderSprite(shutJob.key, shutJob.load, shutJob.source).then(done, () => undefined);
    return () => {
      alive = false;
    };
  }, [baseKey, shutKey]);

  const [rhythm] = useState(() => ({
    "--cs-blink-period": `${(6 + Math.random() * 3).toFixed(2)}s`,
    "--cs-blink-delay": `${(-Math.random() * 6).toFixed(2)}s`,
    "--cs-float-delay": `${(-Math.random() * 8).toFixed(2)}s`,
  }));
  const [twice] = useState(() => Math.random() < 0.25);
  const baseUrl = base ? cachedSprite(baseKey) : undefined;
  const shut = shutJob ? cachedSprite(shutKey) : undefined;
  const clips = shut && character?.eye ? eyeInCrop(character.eye, box) : null;

  return (
    <div
      ref={ref}
      {...DOT_MOTION_INITIAL}
      aria-hidden
      className={cn("goose-cs", className)}
      data-cs-still={still || undefined}
      data-cs-twice={twice || undefined}
      data-cs-size={size >= 48 ? "lg" : "sm"}
      style={{ width: size, height: size, ...rhythm, ...style } as CSSProperties}
    >
      {baseUrl && (
        <div className="goose-cs-float">
          <img
            className={cn("goose-cs-img", shut && !clips && "goose-cs-open")}
            src={baseUrl}
            alt=""
            draggable={false}
            style={clips ? { clipPath: clips.rest } : undefined}
          />
          {shut && clips && (
            <img className="goose-cs-img goose-cs-open" src={baseUrl} alt="" draggable={false} style={{ clipPath: clips.eye }} />
          )}
          {shut && (
            <img
              className="goose-cs-img goose-cs-shut"
              src={shut}
              alt=""
              draggable={false}
              style={clips ? { clipPath: clips.eye } : undefined}
            />
          )}
        </div>
      )}
    </div>
  );
}
