'use client';

import type { CalendarUserSettings } from '@/lib/calendar';

/** Fixed, full-page background image with blur + readability overlay. */
export function CalendarBackground({ settings }: { settings: CalendarUserSettings | null | undefined }) {
  if (!settings?.backgroundUrl) return null;
  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
      <div className="absolute inset-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={settings.backgroundUrl}
          alt=""
          className="h-full w-full scale-105 object-cover"
          style={{ filter: `blur(${settings.backgroundBlur}px)`, opacity: 1 - settings.backgroundOverlay * 0.4 }}
        />
      </div>
      <div className="absolute inset-0" style={{ backgroundColor: `rgb(9 9 11 / ${settings.backgroundOverlay})` }} />
    </div>
  );
}
