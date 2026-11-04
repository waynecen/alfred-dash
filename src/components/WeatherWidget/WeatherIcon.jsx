// A small line icon for a kind of sky (see describeWeather).
function WeatherIcon({ kind, isDay = true, size = 24 }) {
  const sun = (
    <g className="wx-sun">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </g>
  );
  const moon = <path className="wx-sun" d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />;
  const cloud = <path className="wx-cloud" d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7Z" />;
  const smallSun = (
    <g className="wx-sun" transform="translate(-3 -3) scale(0.7)">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 4v2M4 12h2M6.3 6.3l1.4 1.4M17.7 6.3l-1.4 1.4" />
    </g>
  );

  const parts = {
    clear: isDay ? sun : moon,
    partly: (
      <>
        {isDay ? smallSun : <g transform="translate(-3 -3) scale(0.7)">{moon}</g>}
        {cloud}
      </>
    ),
    cloudy: cloud,
    fog: <path className="wx-cloud" d="M4 9h16M3 13h18M5 17h14" />,
    rain: (
      <>
        <path className="wx-cloud" d="M7 15h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 8a3.5 3.5 0 0 0 1 7Z" />
        <path className="wx-rain" d="M8 18l-1 3M12 18l-1 3M16 18l-1 3" />
      </>
    ),
    snow: (
      <>
        <path className="wx-cloud" d="M7 15h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 8a3.5 3.5 0 0 0 1 7Z" />
        <path className="wx-snow" d="M8 19h.01M12 20h.01M16 19h.01M10 22h.01M14 22h.01" />
      </>
    ),
    storm: (
      <>
        <path className="wx-cloud" d="M7 15h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 8a3.5 3.5 0 0 0 1 7Z" />
        <path className="wx-bolt" d="m13 15-3 4h4l-2 4" />
      </>
    ),
  };

  return (
    <svg
      className="wx-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {parts[kind] ?? cloud}
    </svg>
  );
}

export default WeatherIcon;
