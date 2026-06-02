"use client";

import { useState } from "react";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { Badge, Eyebrow } from "@/components/ui";
import { BrowserFrame } from "@/components/shared/browser-frame";
import { PHASES, LESSON_TYPES, SHOTS } from "./curriculum";
import { TypeDot } from "./type-dot";

/**
 * Interactive curriculum browser. Holds a single `active` phase index; the week
 * ruler and the left rail both set it, and the detail pane reflects it. The
 * card is a token-styled <div> (not the DS <Card>) because it needs padding:0 +
 * a CSS grid the .ld-card padding would fight (unlayered .ld-* beats utilities).
 */
export function PhaseExplorer() {
  const [active, setActive] = useState(0);
  const phase = PHASES[active];
  const PhaseIcon = phase.icon;

  return (
    <div>
      {/* Week ruler */}
      <div className="mb-6 flex items-stretch gap-1">
        {PHASES.map((p, i) => {
          const on = i === active;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={on}
              className="flex-1 cursor-pointer text-left"
            >
              <span
                className="block h-1.5 rounded-full transition-colors duration-200 ease-[cubic-bezier(.2,.6,.2,1)]"
                style={{ background: i <= active ? "var(--ld-green)" : "var(--ld-beige-deep)" }}
              />
              <span
                className={`mt-[7px] block text-[11.5px] ${
                  on ? "font-semibold text-[var(--ld-text)]" : "font-medium text-[var(--ld-text-subtle)]"
                }`}
              >
                {p.weeks}
              </span>
            </button>
          );
        })}
      </div>

      {/* Master / detail card */}
      <div className="grid grid-cols-1 overflow-hidden rounded-[20px] border border-[var(--ld-border)] bg-white shadow-[var(--ld-sh-1)] lg:grid-cols-[320px_1fr]">
        {/* Left rail — phase selector */}
        <div className="flex flex-col gap-1.5 border-b border-[var(--ld-border)] bg-[var(--ld-bg-sunken)] p-3.5 lg:border-b-0 lg:border-r">
          {PHASES.map((p, i) => {
            const on = i === active;
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActive(i)}
                aria-pressed={on}
                className={`flex cursor-pointer items-center gap-3.5 rounded-[14px] border p-4 text-left transition-all duration-200 ease-[cubic-bezier(.2,.6,.2,1)] ${
                  on
                    ? "border-[var(--ld-green)] bg-white shadow-[var(--ld-sh-1)]"
                    : "border-transparent bg-transparent"
                }`}
              >
                <span
                  className="grid h-11 w-11 shrink-0 place-content-center rounded-[12px]"
                  style={{
                    background: on ? "var(--ld-green)" : "var(--ld-green-soft)",
                    color: on ? "#fff" : "var(--ld-green-ink)",
                  }}
                >
                  <Icon size={22} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ld-text-subtle)]">
                    Fase {p.key}
                  </span>
                  <span className="mt-0.5 block font-heading text-[16.5px] font-bold text-[var(--ld-text)]">
                    {p.title}
                  </span>
                </span>
                {on && <CaretRight size={16} className="ml-auto text-[var(--ld-green)]" aria-hidden />}
              </button>
            );
          })}
        </div>

        {/* Right — phase detail */}
        <div className="grid grid-cols-1 gap-9 p-9 lg:grid-cols-[1.3fr_.85fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge tone="lime">{phase.weeks}</Badge>
              <Badge>{phase.age}</Badge>
            </div>
            <h3 className="mt-4 font-heading text-[32px] font-bold text-[var(--ld-text)]">{phase.title}</h3>
            <p className="mt-3 text-base leading-[1.65] text-[var(--ld-text-muted)]">{phase.blurb}</p>
            <Eyebrow className="mt-6 block">Lessen in deze fase</Eyebrow>
            <ul className="mt-3.5 grid list-none gap-1 p-0">
              {phase.lessons.map(([type, label]) => (
                <li
                  key={label}
                  className="flex items-center gap-[13px] rounded-[12px] px-3 py-[11px] transition-colors duration-150 hover:bg-[var(--ld-bg-sunken)]"
                >
                  <TypeDot type={type} size={30} />
                  <span className="text-[15px] font-medium text-[var(--ld-text)]">{label}</span>
                  <span className="ml-auto text-xs text-[var(--ld-text-subtle)]">{LESSON_TYPES[type].label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <BrowserFrame
              src={SHOTS.agenda.src}
              alt={SHOTS.agenda.alt}
              width={SHOTS.agenda.width}
              height={SHOTS.agenda.height}
              sizes="(max-width: 1024px) 90vw, 360px"
              className="shadow-[var(--ld-sh-2)]"
            />
            <div className="rounded-[14px] bg-[var(--ld-green-soft)] px-[18px] py-4">
              <div className="font-heading text-base font-bold text-[var(--ld-text)]">Zo ziet je week eruit</div>
              <p className="mt-1.5 text-[13.5px] leading-[1.55] text-[var(--ld-text-muted)]">
                In de app staan de lessen klaar als afvinkbare kaarten. Rood is video, groen is lezen, blauw is audio.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
