// Weather from Open-Meteo (https://open-meteo.com): free, and no API key needed.

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

// Places matching a name, as { id, name, region, country, latitude, longitude }.
export async function searchPlaces(query) {
  const params = new URLSearchParams({ name: query, count: '5', language: 'en', format: 'json' });
  const response = await fetch(`${GEOCODE_URL}?${params}`);
  if (!response.ok) throw new Error('Could not search for places');
  const data = await response.json();
  return (data.results ?? []).map((place) => ({
    id: place.id,
    name: place.name,
    region: place.admin1 ?? '',
    country: place.country ?? '',
    latitude: place.latitude,
    longitude: place.longitude,
  }));
}

// Current conditions, the next 24 hours and the next 10 days for a place. Times are the place's
// local time, as "2026-11-03T14:00" strings.
export async function fetchForecast({ latitude, longitude }) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current:
      'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,' +
      'weather_code,is_day,precipitation,pressure_msl',
    hourly: 'temperature_2m,weather_code,precipitation_probability,is_day',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,' +
      'sunrise,sunset,uv_index_max',
    timezone: 'auto',
    forecast_days: '10',
  });
  const response = await fetch(`${FORECAST_URL}?${params}`);
  if (!response.ok) throw new Error('Could not load the forecast');
  const data = await response.json();

  // The hourly list starts at midnight; skip to the hour we are in now.
  const hourly = data.hourly;
  const nowHour = data.current.time.slice(0, 13);
  const first = Math.max(0, hourly.time.findIndex((time) => time.slice(0, 13) === nowHour));

  return {
    current: {
      time: data.current.time,
      temperature: data.current.temperature_2m,
      feelsLike: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      wind: data.current.wind_speed_10m,
      windDirection: data.current.wind_direction_10m,
      code: data.current.weather_code,
      isDay: data.current.is_day === 1,
      precipitation: data.current.precipitation,
      pressure: data.current.pressure_msl,
    },
    hours: hourly.time.slice(first, first + 24).map((time, i) => ({
      time,
      temperature: hourly.temperature_2m[first + i],
      code: hourly.weather_code[first + i],
      rain: hourly.precipitation_probability?.[first + i] ?? null,
      isDay: hourly.is_day[first + i] === 1,
    })),
    days: data.daily.time.map((date, i) => ({
      date,
      code: data.daily.weather_code[i],
      max: data.daily.temperature_2m_max[i],
      min: data.daily.temperature_2m_min[i],
      rain: data.daily.precipitation_probability_max?.[i] ?? null,
      sunrise: data.daily.sunrise[i],
      sunset: data.daily.sunset[i],
      uv: data.daily.uv_index_max?.[i] ?? null,
    })),
  };
}

// 0–360 degrees to a compass point.
export function compassPoint(degrees) {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(degrees / 45) % 8];
}

export function uvLevel(index) {
  if (index < 3) return 'Low';
  if (index < 6) return 'Moderate';
  if (index < 8) return 'High';
  if (index < 11) return 'Very high';
  return 'Extreme';
}

// WMO weather codes, grouped into the few kinds of sky we draw.
export function describeWeather(code) {
  if (code === 0) return { label: 'Clear', kind: 'clear' };
  if (code <= 2) return { label: 'Partly cloudy', kind: 'partly' };
  if (code === 3) return { label: 'Overcast', kind: 'cloudy' };
  if (code <= 48) return { label: 'Fog', kind: 'fog' };
  if (code <= 57) return { label: 'Drizzle', kind: 'rain' };
  if (code <= 67) return { label: 'Rain', kind: 'rain' };
  if (code <= 77) return { label: 'Snow', kind: 'snow' };
  if (code <= 82) return { label: 'Showers', kind: 'rain' };
  if (code <= 86) return { label: 'Snow showers', kind: 'snow' };
  return { label: 'Thunderstorm', kind: 'storm' };
}
