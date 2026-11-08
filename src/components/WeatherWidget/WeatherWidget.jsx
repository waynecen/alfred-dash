import { useEffect, useState } from 'react';
import useLocalStorage from '../../hooks/useLocalStorage';
import useSettings from '../../hooks/useSettings';
import { hourCycle } from '../../data/settings';
import { compassPoint, describeWeather, fetchForecast, searchPlaces, uvLevel } from '../../utils/weather';
import WidgetState from '../WidgetState/WidgetState';
import WeatherIcon from './WeatherIcon';
import './WeatherWidget.css';

const round = (value) => Math.round(value);
const placeLabel = (place) => [place.region, place.country].filter(Boolean).join(', ');
const dayName = (date, index) =>
  index === 0 ? 'Today' : new Date(`${date}T12:00:00`).toLocaleDateString('en', { weekday: 'short' });
// timeFormat: from Settings ('auto', '12h' or '24h'); 'auto' keeps the compact "3PM" style.
const hourName = (time, index, timeFormat) =>
  index === 0
    ? 'Now'
    : new Date(time).toLocaleTimeString('en', { hour: 'numeric', ...hourCycle(timeFormat) }).replace(' ', '');
const clock = (time, timeFormat) =>
  new Date(time).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit', ...hourCycle(timeFormat) });

// Saved places, one shown at a time, styled after Apple's Weather app. The widget shows more as it
// grows: just the temperature when small, then the hourly forecast, the 10-day forecast and the
// detail tiles (see the container queries in WeatherWidget.css).
function WeatherWidget() {
  const [places, setPlaces] = useLocalStorage('weatherPlaces', []);
  const [activeId, setActiveId] = useLocalStorage('weatherActive', null);
  const [adding, setAdding] = useState(false);
  const active = places.find((place) => place.id === activeId) ?? places[0];

  function addPlace(place) {
    if (!places.some((saved) => saved.id === place.id)) setPlaces([...places, place]);
    setActiveId(place.id);
    setAdding(false);
  }

  function removePlace(id) {
    const rest = places.filter((place) => place.id !== id);
    setPlaces(rest);
    if (id === active?.id) setActiveId(rest[0]?.id ?? null);
  }

  return (
    <div className="weather-widget">
      <div className="weather-places" role="tablist" aria-label="Locations">
        {places.map((place) => (
          <span key={place.id} className={`weather-chip${place.id === active?.id ? ' is-active' : ''}`}>
            <button
              type="button"
              role="tab"
              aria-selected={place.id === active?.id}
              onClick={() => {
                setActiveId(place.id);
                setAdding(false);
              }}
            >
              {place.name}
            </button>
            <button
              type="button"
              className="weather-chip-remove"
              aria-label={`Remove ${place.name}`}
              onClick={() => removePlace(place.id)}
            >
              ×
            </button>
          </span>
        ))}
        <button
          type="button"
          className="weather-add"
          aria-label="Add location"
          aria-expanded={adding}
          onClick={() => setAdding(!adding)}
        >
          {/* Drawn rather than typed, so it sits in the exact centre whatever the font. */}
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {adding || !active ? (
        <PlaceSearch onPick={addPlace} onCancel={places.length ? () => setAdding(false) : null} autoFocus={adding} />
      ) : (
        <Forecast key={active.id} place={active} />
      )}
    </div>
  );
}

// autoFocus: when someone asked to add a place; never on its own when the page loads, which would
// take focus from wherever the user is.
function PlaceSearch({ onPick, onCancel, autoFocus = false }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | error

  async function handleSubmit(event) {
    event.preventDefault();
    if (!query.trim()) return;
    setStatus('loading');
    try {
      setResults(await searchPlaces(query.trim()));
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="weather-search">
      <form onSubmit={handleSubmit} className="weather-search-form">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search for a city"
          aria-label="City"
          autoFocus={autoFocus}
        />
        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Searching…' : 'Search'}
        </button>
        {onCancel && (
          <button type="button" className="weather-link" onClick={onCancel}>
            Cancel
          </button>
        )}
      </form>
      {status === 'error' && (
        <WidgetState
          status="error"
          className="weather-note"
          message="Search failed. Check your connection and try again."
        />
      )}
      {results?.length === 0 && <WidgetState status="empty" className="weather-note" message="No places found." />}
      {results?.length > 0 && (
        <ul className="weather-results">
          {results.map((place) => (
            <li key={place.id}>
              <button type="button" onClick={() => onPick(place)}>
                <strong>{place.name}</strong>
                <span>{placeLabel(place)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {!results && status === 'idle' && (
        <WidgetState status="empty" className="weather-note" message="Add a city to see its forecast." />
      )}
    </div>
  );
}

function Forecast({ place }) {
  const [forecast, setForecast] = useState(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0); // bumped by Retry to fetch again
  const [{ temperatureUnit, timeFormat }] = useSettings();

  // Fetched again when the unit changes: the forecast comes in the unit asked for.
  useEffect(() => {
    let ignore = false;
    setError(false);
    fetchForecast(place, { temperatureUnit })
      .then((data) => !ignore && setForecast(data))
      .catch(() => !ignore && setError(true));
    return () => {
      ignore = true;
    };
  }, [place, attempt, temperatureUnit]);

  if (error) {
    return (
      <WidgetState
        status="error"
        className="weather-note"
        message={`Could not load the forecast for ${place.name}.`}
        onRetry={() => setAttempt(attempt + 1)}
      />
    );
  }
  if (!forecast) return <WidgetState status="loading" className="weather-note" message="Loading forecast…" />;

  const { current, hours, days } = forecast;
  const sky = describeWeather(current.code);
  const today = days[0];

  return (
    <div className="weather-forecast" data-sky={current.isDay ? sky.kind : 'night'}>
      <section className="wx-hero" aria-label={`Current weather in ${place.name}`}>
        <h3 className="wx-city">{place.name}</h3>
        <p className="wx-temp">{round(current.temperature)}°</p>
        <p className="wx-condition">{sky.label}</p>
        <p className="wx-hilo">
          H:{round(today.max)}° L:{round(today.min)}°
        </p>
      </section>

      <section className="wx-card wx-hourly" aria-label="Hourly forecast">
        <h4 className="wx-label">Hourly forecast</h4>
        <ol>
          {hours.map((hour, index) => {
            const hourSky = describeWeather(hour.code);
            return (
              <li key={hour.time}>
                <span className="wx-hour">{hourName(hour.time, index, timeFormat)}</span>
                <span className="wx-hour-icon" title={hourSky.label}>
                  <WeatherIcon kind={hourSky.kind} isDay={hour.isDay} size={22} />
                  {hour.rain >= 20 && <span className="wx-chance">{hour.rain}%</span>}
                </span>
                <span className="wx-hour-temp">{round(hour.temperature)}°</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="wx-card wx-daily" aria-label="10-day forecast">
        <h4 className="wx-label">10-day forecast</h4>
        <DayList days={days} current={current.temperature} />
      </section>

      <section className="wx-details" aria-label="Details">
        <Tile label="Feels like" value={`${round(current.feelsLike)}°`}>
          {feelsLikeNote(current, temperatureUnit)}
        </Tile>
        <Tile label="Humidity" value={`${round(current.humidity)}%`}>
          {today.rain !== null && `${today.rain}% chance of rain today`}
        </Tile>
        <Tile label="Wind" value={`${round(current.wind)} km/h`}>
          From the {compassPoint(current.windDirection)}
        </Tile>
        {today.uv !== null && (
          <Tile label="UV index" value={round(today.uv)}>
            {uvLevel(today.uv)}
          </Tile>
        )}
        <Tile label="Sunrise" value={clock(today.sunrise, timeFormat)}>
          Sunset: {clock(today.sunset, timeFormat)}
        </Tile>
        <Tile label="Pressure" value={`${round(current.pressure)} hPa`}>
          {current.precipitation > 0 ? `${current.precipitation} mm falling now` : 'No rain right now'}
        </Tile>
      </section>
    </div>
  );
}

// Each day's low-to-high bar sits on a scale shared by the whole list, like Apple's.
function DayList({ days, current }) {
  const lowest = Math.min(...days.map((day) => day.min));
  const highest = Math.max(...days.map((day) => day.max));
  const range = highest - lowest || 1;
  const at = (value) => `${((value - lowest) / range) * 100}%`;

  return (
    <ol>
      {days.map((day, index) => {
        const daySky = describeWeather(day.code);
        return (
          <li key={day.date}>
            <span className="wx-day">{dayName(day.date, index)}</span>
            <span className="wx-day-icon" title={daySky.label}>
              <WeatherIcon kind={daySky.kind} size={20} />
              {day.rain >= 20 && <span className="wx-chance">{day.rain}%</span>}
              <span className="visually-hidden">{daySky.label}</span>
            </span>
            <span className="wx-min">{round(day.min)}°</span>
            <span className="wx-bar" aria-hidden="true">
              <span className="wx-bar-fill" style={{ left: at(day.min), right: `calc(100% - ${at(day.max)})` }} />
              {index === 0 && <span className="wx-bar-now" style={{ left: at(current) }} />}
            </span>
            <span className="wx-max">{round(day.max)}°</span>
          </li>
        );
      })}
    </ol>
  );
}

function Tile({ label, value, children }) {
  return (
    <div className="wx-card wx-tile">
      <h4 className="wx-label">{label}</h4>
      <p className="wx-tile-value">{value}</p>
      {children && <p className="wx-tile-note">{children}</p>}
    </div>
  );
}

// unit: the forecast's temperature unit; 2 °C is about 4 °F.
function feelsLikeNote({ temperature, feelsLike }, unit) {
  const difference = Math.round(feelsLike - temperature);
  const noticeable = unit === 'fahrenheit' ? 4 : 2;
  if (difference <= -noticeable) return 'Wind is making it feel cooler';
  if (difference >= noticeable) return 'Humidity is making it feel warmer';
  return 'Similar to the actual temperature';
}

export default WeatherWidget;
