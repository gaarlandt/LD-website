import { LESSON_TYPES, type LessonType } from "./curriculum";

/**
 * Lesson-type badge — a rounded-square swatch with the type's fill icon,
 * driven by the LESSON_TYPES map (mirrors the app's icon coding). The swatch
 * colours are functional, so they're applied as inline styles, not tokens.
 */
export function TypeDot({ type, size = 30 }: { type: LessonType; size?: number }) {
  const t = LESSON_TYPES[type];
  const Icon = t.icon;
  return (
    <span
      className="grid shrink-0 place-content-center rounded-[9px]"
      style={{ width: size, height: size, background: t.bg, color: t.fg }}
    >
      <Icon size={Math.round(size * 0.5)} weight="fill" aria-hidden />
    </span>
  );
}
