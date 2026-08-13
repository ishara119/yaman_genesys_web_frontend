import { useEffect, useState } from 'react';

export default function Footer() {
  const [dim, setDim] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let intervalId: ReturnType<typeof setInterval>;
    let disposed = false;

    function scheduleFlicker() {
      const delay = 1200 + Math.random() * 3500;
      timeoutId = setTimeout(() => {
        const bursts = 1 + Math.floor(Math.random() * 3);
        let count = 0;
        intervalId = setInterval(() => {
          setDim((prev) => !prev);
          count++;
          if (count >= bursts * 2) {
            clearInterval(intervalId);
            setDim(false);
            if (!disposed) scheduleFlicker();
          }
        }, 60);
      }, delay);
    }

    scheduleFlicker();

    return () => {
      disposed = true;
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <footer className="site-footer">
      <span>&copy; 2026 YAMAN MUSIC</span>
      <span className="divider" aria-hidden="true" />
      <span className="flicker" style={{ opacity: dim ? 0.15 : 1 }}>
        NOV 21ST 2026
      </span>
      <span className="divider" aria-hidden="true" />
      <span>CEY NOR, COLOMBO</span>
    </footer>
  );
}
