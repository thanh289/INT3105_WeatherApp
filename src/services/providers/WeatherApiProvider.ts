// src/services/providers/WeatherApiProvider.ts

import axios from "axios"
import { config } from "dotenv"
import { IWeatherProvider, IProviderWeatherData } from "./IWeatherProvider"

config()

export class WeatherApiProvider implements IWeatherProvider {
    private baseUrl: string
    private apiKey: string

    constructor() {
        this.baseUrl = process.env.IWEATHER_API_URL || "http://api.weatherapi.com/v1/current.json"
        this.apiKey = process.env.WEATHER_API_KEY || ""
        if (!this.apiKey) {
            console.warn("[IWeatherApiProvider] WEATHER_API_KEY not set in .env")
        }
    }

    public async getWeather(city: string): Promise<IProviderWeatherData> {
        const url = `${this.baseUrl}?key=${this.apiKey}&q=${encodeURIComponent(city)}&aqi=no`
        const response = await axios.get(url)
        const data = response.data

        const adapted: IProviderWeatherData = {
            name: data.location?.name ?? city,
            country: data.location?.country ?? null,
            temp: data.current?.temp_c ?? null,
            pressure: data.current?.pressure_mb ?? null,
            minTemp: null,
            maxTemp: null,
            humidity: data.current?.humidity ?? null,
            sunrise: null,
            sunset: null,
            coord: {
                lon: data.location?.lon ?? null,
                lat: data.location?.lat ?? null,
            },
            raw: data,
        }

        return adapted
    }
}
