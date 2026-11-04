import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import WeatherWidget from './WeatherWidget';
import { describeWeather } from '../../utils/weather';

const london = { id: 1, name: 'London', admin1: 'England', country: 'United Kingdom', latitude: 51.5, longitude: -0.12 };
const paris = { id: 2, name: 'Paris', admin1: 'Île-de-France', country: 'France', latitude: 48.85, longitude: 2.35 };

// The hourly list starts at midnight; it is 13:20 now.
const hourTimes = Array.from({ length: 48 }, (_, i) => {
  const day = i < 24 ? '03' : '04';
  return `2026-11-${day}T${String(i % 24).padStart(2, '0')}:00`;
});

const forecast = (temperature) => ({
  current: {
    time: '2026-11-03T13:20',
    temperature_2m: temperature,
    apparent_temperature: temperature - 3,
    relative_humidity_2m: 70,
    wind_speed_10m: 12,
    wind_direction_10m: 225,
    weather_code: 61,
    is_day: 1,
    precipitation: 0.4,
    pressure_msl: 1012.6,
  },
  hourly: {
    time: hourTimes,
    temperature_2m: hourTimes.map((_, i) => i),
    weather_code: hourTimes.map(() => 3),
    precipitation_probability: hourTimes.map((_, i) => (i === 14 ? 60 : 0)),
    is_day: hourTimes.map(() => 1),
  },
  daily: {
    time: ['2026-11-03', '2026-11-04', '2026-11-05'],
    weather_code: [0, 3, 95],
    temperature_2m_max: [15, 13, 11],
    temperature_2m_min: [8, 6, 4],
    precipitation_probability_max: [0, 20, 80],
    sunrise: ['2026-11-03T06:52', '2026-11-04T06:54', '2026-11-05T06:56'],
    sunset: ['2026-11-03T16:31', '2026-11-04T16:29', '2026-11-05T16:27'],
    uv_index_max: [2.4, 1.8, 1.1],
  },
});

// Answers the Open-Meteo requests: a search for "lon" finds London, "par" finds Paris.
function mockApi() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    const params = new URL(url).searchParams;
    let body;
    if (url.includes('geocoding')) {
      const name = params.get('name').toLowerCase();
      body = { results: [london, paris].filter((place) => place.name.toLowerCase().startsWith(name)) };
      if (!body.results.length) body = {};
    } else {
      body = forecast(params.get('latitude') === '51.5' ? 14.4 : 18);
    }
    return { ok: true, json: async () => body };
  });
}

async function addPlace(search, pick) {
  await userEvent.type(screen.getByRole('searchbox', { name: 'City' }), search);
  await userEvent.click(screen.getByRole('button', { name: 'Search' }));
  await userEvent.click(await screen.findByRole('button', { name: new RegExp(`^${pick}`) }));
}

describe('WeatherWidget', () => {
  afterEach(() => vi.restoreAllMocks());

  it('asks for a city when no places are saved', () => {
    mockApi();
    render(<WeatherWidget />);
    expect(screen.getByRole('searchbox', { name: 'City' })).toBeInTheDocument();
    expect(screen.getByText('Add a city to see its forecast.')).toBeInTheDocument();
  });

  it('finds a place, shows its weather and forecast, and remembers it', async () => {
    mockApi();
    render(<WeatherWidget />);
    await addPlace('lon', 'London');

    const now = await screen.findByRole('region', { name: 'Current weather in London' });
    expect(now).toHaveTextContent('London14°RainH:15° L:8°');

    // The next 24 hours, starting from the hour we are in.
    const hours = within(screen.getByRole('region', { name: 'Hourly forecast' })).getAllByRole('listitem');
    expect(hours).toHaveLength(24);
    expect(hours[0]).toHaveTextContent('Now13°');
    expect(hours[1]).toHaveTextContent('60%');

    const days = within(screen.getByRole('region', { name: '10-day forecast' })).getAllByRole('listitem');
    expect(days).toHaveLength(3);
    expect(days[0]).toHaveTextContent('Today');
    expect(days[2]).toHaveTextContent('Thunderstorm');
    expect(days[2]).toHaveTextContent('80%');

    const details = screen.getByRole('region', { name: 'Details' });
    expect(details).toHaveTextContent('Feels like11°Wind is making it feel cooler');
    expect(details).toHaveTextContent('Humidity70%');
    expect(details).toHaveTextContent('Wind12 km/hFrom the SW');
    expect(details).toHaveTextContent('UV index2Low');
    expect(details).toHaveTextContent('Pressure1013 hPa0.4 mm falling now');

    expect(JSON.parse(localStorage.getItem('weatherPlaces'))).toMatchObject([{ id: 1, name: 'London' }]);
  });

  it('says so when no place matches', async () => {
    mockApi();
    render(<WeatherWidget />);
    await userEvent.type(screen.getByRole('searchbox', { name: 'City' }), 'zzz');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('No places found.')).toBeInTheDocument();
  });

  it('switches between saved places and removes one', async () => {
    mockApi();
    render(<WeatherWidget />);
    await addPlace('lon', 'London');
    await userEvent.click(screen.getByRole('button', { name: 'Add location' }));
    await addPlace('par', 'Paris');
    expect(await screen.findByRole('region', { name: 'Current weather in Paris' })).toHaveTextContent('18°');

    await userEvent.click(screen.getByRole('tab', { name: 'London' }));
    expect(await screen.findByRole('region', { name: 'Current weather in London' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Remove London' }));
    expect(screen.queryByRole('tab', { name: 'London' })).not.toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Current weather in Paris' })).toBeInTheDocument();
  });

  it('shows an error when the forecast cannot be loaded', async () => {
    localStorage.setItem('weatherPlaces', JSON.stringify([{ id: 1, name: 'London', latitude: 51.5, longitude: -0.12 }]));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false });
    render(<WeatherWidget />);
    expect(await screen.findByText('Could not load the forecast for London.')).toBeInTheDocument();
  });
});

describe('describeWeather', () => {
  it('groups WMO codes into kinds of sky', () => {
    expect(describeWeather(0)).toEqual({ label: 'Clear', kind: 'clear' });
    expect(describeWeather(2).kind).toBe('partly');
    expect(describeWeather(45).kind).toBe('fog');
    expect(describeWeather(63).kind).toBe('rain');
    expect(describeWeather(75).kind).toBe('snow');
    expect(describeWeather(96).kind).toBe('storm');
  });
});
