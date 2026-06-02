import { LockSimple } from "@phosphor-icons/react/dist/ssr";
import { OptimizedImage } from "@/components/shared/optimized-image";

type BrowserFrameProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Faux address-bar URL. */
  url?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
};

/**
 * Faux browser window wrapping an app screenshot. Token-styled (not the DS
 * <Card>, which sets padding we'd need to override — and unlayered .ld-* beats
 * Tailwind utilities). The body is an OptimizedImage at width:100%.
 */
export function BrowserFrame({
  src,
  alt,
  width,
  height,
  url = "app.letsdog.nl/agenda",
  sizes,
  priority,
  className,
}: BrowserFrameProps) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[var(--ld-border)] bg-white shadow-[var(--ld-sh-3)]${
        className ? ` ${className}` : ""
      }`}
    >
      {/* Title bar */}
      <div className="flex h-[38px] items-center gap-4 border-b border-[var(--ld-border)] bg-[var(--ld-bg-sunken)] px-3.5">
        <div className="flex gap-[7px]" aria-hidden>
          <span className="h-[11px] w-[11px] rounded-full bg-[#E5816B]" />
          <span className="h-[11px] w-[11px] rounded-full bg-[#E8C26B]" />
          <span className="h-[11px] w-[11px] rounded-full bg-[#88B074]" />
        </div>
        <div className="flex h-[22px] max-w-[320px] flex-1 items-center gap-[7px] rounded-full border border-[var(--ld-border)] bg-white px-3 text-[11.5px] text-[var(--ld-text-subtle)]">
          <LockSimple size={11} aria-hidden />
          <span className="truncate">{url}</span>
        </div>
      </div>

      {/* Body — the app screenshot */}
      <OptimizedImage
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
        className="block h-auto w-full"
      />
    </div>
  );
}
