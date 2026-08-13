import { useEffect, useState } from 'react';
import { EVENT_DATE } from '../event';

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isLive: boolean;
}

function getRemaining(): Remaining {
  const diff = EVENT_DATE.getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isLive: true };
  }
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    isLive: false,
  };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default function Countdown() {
  const [remaining, setRemaining] = useState<Remaining>(getRemaining);

  useEffect(() => {
    const id = setInterval(() => setRemaining(getRemaining()), 1000);
    return () => clearInterval(id);
  }, []);

  if (remaining.isLive) {
    return (
      <div className="countdown">
        <span className="countdown-live">EVENT LIVE</span>
      </div>
    );
  }

  const units: Array<[string, number]> = [
    ['DAYS', remaining.days],
    ['HRS', remaining.hours],
    ['MIN', remaining.minutes],
    ['SEC', remaining.seconds],
  ];

  return (
    <div className="countdown" aria-label={`Countdown to event: ${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes, ${remaining.seconds} seconds`}>
      <span className="countdown-caption">T-MINUS</span>
      <div className="countdown-units">
        {units.map(([label, value], i) => (
          <div className="countdown-unit" key={label}>
            {i > 0 && <span className="countdown-sep">:</span>}
            <span className="countdown-value">{pad(value)}</span>
            <span className="countdown-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
