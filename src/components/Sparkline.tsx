// A dependency-free inline-SVG sparkline for a 0–1 accuracy series. Draws in
// `currentColor`, so callers set the hue with a Tailwind text-* class and it
// tracks light/dark automatically.

export function Sparkline({
  data,
  width = 72,
  height = 20,
  className,
}: {
  /** Accuracy values, 0–1, oldest→newest. */
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (data.length === 0) return null;

  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const x = (i: number) =>
    data.length === 1 ? width / 2 : pad + (i / (data.length - 1)) * innerW;
  const y = (v: number) => pad + (1 - Math.max(0, Math.min(1, v))) * innerH;

  const points = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = data[data.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label="Accuracy trend"
      preserveAspectRatio="none"
    >
      {data.length > 1 && (
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <circle cx={x(data.length - 1)} cy={y(last)} r={1.8} fill="currentColor" />
    </svg>
  );
}
