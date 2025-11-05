// src/services/providers/IWeatherProvider.ts
// I for interface
export interface IProviderWeatherData {
    name: string;        // city name
    country: string;
    temp: number | null;
    pressure: number | null;
    minTemp?: number | null;
    maxTemp?: number | null;
    humidity?: number | null;
    sunrise?: number | null;
    sunset?: number | null;
    coord?: { lon: number | null; lat: number | null };
    raw?: any;           // raw original provider payload (for debugging)
}

export interface IWeatherProvider {
    getWeather(city: string): Promise<IProviderWeatherData>;
}
