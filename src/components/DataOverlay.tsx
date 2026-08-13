import type { ReactNode } from 'react';

type Position = 'tl' | 'tr' | 'bl' | 'br';

interface DataOverlayProps {
  position: Position;
  lines: ReactNode[];
}

export default function DataOverlay({ position, lines }: DataOverlayProps) {
  return (
    <div className={`data-overlay data-${position}`}>
      {lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
}
