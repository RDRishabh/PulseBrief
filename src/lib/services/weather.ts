import type { WeatherData } from "./types";

export async function fetchWeather(city: string): Promise<WeatherData> {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (apiKey) {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`,
        { next: { revalidate: 3600 } }
      );

      if (res.ok) {
        const data = await res.json();
        return {
          city: data.name,
          temperature: Math.round(data.main.temp),
          condition: data.weather[0]?.description ?? "Clear",
          humidity: data.main.humidity,
          icon: data.weather[0]?.icon ?? "01d",
        };
      }
    } catch {
      // fall through to wttr.in
    }
  }

  try {
    const res = await fetch(
      `https://wttr.in/${encodeURIComponent(city)}?format=j1`,
      { next: { revalidate: 3600 } }
    );

    if (res.ok) {
      const data = await res.json();
      const current = data.current_condition?.[0];
      return {
        city,
        temperature: parseInt(current?.temp_C ?? "28", 10),
        condition: current?.weatherDesc?.[0]?.value ?? "Partly cloudy",
        humidity: parseInt(current?.humidity ?? "65", 10),
        icon: "01d",
      };
    }
  } catch {
    // fall through to mock
  }

  return {
    city,
    temperature: 28,
    condition: "Partly cloudy",
    humidity: 65,
    icon: "02d",
  };
}