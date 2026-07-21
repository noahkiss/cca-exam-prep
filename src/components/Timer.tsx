import { useEffect, useState } from 'react';

/** Countdown timer. Calls onExpire once when it hits zero. */
export function Timer({
  deadline,
  onExpire,
}: {
  /** Epoch ms when time runs out. */
  deadline: number;
  onExpire: () => void;
}) {
  const [remaining, setRemaining] = useState(() => Math.max(0, deadline - Date.now()));

  useEffect(() => {
    const tick = () => {
      const rem = Math.max(0, deadline - Date.now());
      setRemaining(rem);
      if (rem <= 0) onExpire();
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadline, onExpire]);

  const totalSec = Math.floor(remaining / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const low = remaining <= 5 * 60 * 1000;

  return (
    <div
      className={`rounded-lg px-3 py-1.5 font-mono text-sm font-semibold tabular-nums ${
        low
          ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
      }`}
      role="timer"
      aria-live={low ? 'assertive' : 'off'}
    >
      {mins}:{secs.toString().padStart(2, '0')}
    </div>
  );
}
