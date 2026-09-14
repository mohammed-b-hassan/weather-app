/**
 * OpenWeatherMap icon codes rendered as inline SVG.
 *
 * Codes are `NNd` / `NNn` — 01 clear, 02 few clouds, 03 scattered, 04 broken,
 * 09 shower, 10 rain, 11 thunderstorm, 13 snow, 50 mist. The `d`/`n` suffix
 * only changes clear/few-clouds (sun vs moon).
 */

type Props = {
  code: string;
  description: string;
  className?: string;
};

function Sun({ cx = 32, cy = 32, r = 11 }) {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <g className="text-sun">
      <circle cx={cx} cy={cy} r={r} fill="currentColor" />
      {rays.map((angle) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <line
            key={angle}
            x1={cx + Math.cos(rad) * (r + 4)}
            y1={cy + Math.sin(rad) * (r + 4)}
            x2={cx + Math.cos(rad) * (r + 9)}
            y2={cy + Math.sin(rad) * (r + 9)}
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
}

function Moon() {
  return (
    <g className="text-moon">
      <path
        d="M42 38a16 16 0 0 1-18.6-21.6A17 17 0 1 0 46 42a16.6 16.6 0 0 1-4 -4Z"
        fill="currentColor"
      />
    </g>
  );
}

/** Built from overlapping circles rather than one path — predictable at any size. */
function Cloud({ y = 0, scale = 1 }) {
  return (
    <g
      className="text-cloud"
      transform={`translate(32 ${32 + y}) scale(${scale}) translate(-32 -32)`}
      fill="currentColor"
    >
      <circle cx="23" cy="34" r="10" />
      <circle cx="36" cy="29" r="13" />
      <circle cx="45" cy="36" r="9" />
      <rect x="20" y="34" width="29" height="11" rx="5.5" />
    </g>
  );
}

function Drops({ count = 3, className = 'text-rain' }) {
  const xs = count === 2 ? [26, 38] : [22, 32, 42];
  return (
    <g className={className} stroke="currentColor" strokeLinecap="round">
      {xs.map((x, i) => (
        <line
          key={x}
          x1={x}
          y1={48 + (i % 2) * 2}
          x2={x - 3}
          y2={57 + (i % 2) * 2}
          strokeWidth="3.5"
        />
      ))}
    </g>
  );
}

function Flakes() {
  return (
    <g className="text-snow" fill="currentColor">
      {[22, 32, 42].map((x, i) => (
        <circle key={x} cx={x} cy={51 + (i % 2) * 4} r="3" />
      ))}
    </g>
  );
}

function Bolt() {
  return (
    <g className="text-bolt">
      <path d="M34 44 L24 58 L31 58 L28 64 L40 50 L33 50 Z" fill="currentColor" />
    </g>
  );
}

function Mist() {
  return (
    <g className="text-cloud" stroke="currentColor" strokeLinecap="round">
      {[22, 32, 42, 52].map((y, i) => (
        <line
          key={y}
          x1={i % 2 === 0 ? 12 : 18}
          y1={y}
          x2={i % 2 === 0 ? 50 : 56}
          y2={y}
          strokeWidth="4"
        />
      ))}
    </g>
  );
}

function Glyph({ code }: { code: string }) {
  const group = code.slice(0, 2);
  const night = code.endsWith('n');

  switch (group) {
    case '01':
      return night ? <Moon /> : <Sun />;
    case '02':
      return (
        <>
          {night ? (
            <g transform="translate(12 -6) scale(0.7)">
              <Moon />
            </g>
          ) : (
            <Sun cx={42} cy={22} r={8} />
          )}
          <Cloud y={6} scale={0.85} />
        </>
      );
    case '03':
      return <Cloud y={2} scale={0.95} />;
    case '04':
      return (
        <>
          <g className="text-cloud" opacity="0.55">
            <circle cx="42" cy="22" r="11" fill="currentColor" />
          </g>
          <Cloud y={6} scale={0.9} />
        </>
      );
    case '09':
      return (
        <>
          <Cloud y={-4} scale={0.85} />
          <Drops count={3} />
        </>
      );
    case '10':
      return (
        <>
          {!night && <Sun cx={46} cy={18} r={7} />}
          <Cloud y={-4} scale={0.85} />
          <Drops count={2} />
        </>
      );
    case '11':
      return (
        <>
          <Cloud y={-6} scale={0.85} />
          <Bolt />
        </>
      );
    case '13':
      return (
        <>
          <Cloud y={-4} scale={0.85} />
          <Flakes />
        </>
      );
    case '50':
      return <Mist />;
    default:
      return <Cloud y={2} scale={0.95} />;
  }
}

export function WeatherIcon({ code, description, className = 'size-16' }: Props) {
  return (
    <svg
      viewBox="0 0 64 68"
      className={className}
      role="img"
      aria-label={description}
    >
      <Glyph code={code} />
    </svg>
  );
}
