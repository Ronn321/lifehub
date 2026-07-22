'use client';

/**
 * PlayingIndicator — animated equalizer bars shown on the currently playing track.
 */
export function PlayingIndicator() {
  return (
    <div className="flex items-end gap-[2px] h-4 w-4 justify-center" aria-label="Wird wiedergegeben">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[2px] rounded-full"
          style={{
            height: '100%',
            background: 'var(--music-accent)',
            transformOrigin: 'bottom',
            animation: `eq-bounce 0.8s ${i * 0.15}s ease-in-out infinite alternate`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes eq-bounce {
          0%   { transform: scaleY(0.3); }
          100% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
