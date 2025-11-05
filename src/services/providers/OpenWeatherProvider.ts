// src/services/providers/OpenWeatherProvider.ts
import axios from "axios"
import { config } from "dotenv"
import { IWeatherProvider, IProviderWeatherData } from "./IWeatherProvider"

config()

export class OpenWeatherProvider implements IWeatherProvider {
    private baseUrl: string
    private apiKey: string

    constructor() {
        this.baseUrl = process.env.OPEN_WEATHER_URL || "http://api.openweathermap.org/data/2.5/weather"
        this.apiKey = process.env.OPEN_WEATHER_KEY || ""
        if (!this.apiKey) {
            console.warn("[OpenWeatherProvider] OPEN_WEATHER_APP_ID not set in env.")
        }
    }

    public async getWeather(city: string): Promise<IProviderWeatherData> {
        const url = `${this.baseUrl}?q=${encodeURIComponent(city)}&units=metric&appid=${this.apiKey}`
        const response = await axios.get(url)
        const data = response.data

        // Adapt OpenWeather response into common IProviderWeatherData
        const adapted: IProviderWeatherData = {
            name: data.name ?? city,
            country: data.sys?.country ?? null,
            temp: data.main?.temp ?? null,
            pressure: data.main?.pressure ?? null,
            minTemp: data.main?.temp_min ?? null,
            maxTemp: data.main?.temp_max ?? null,
            humidity: data.main?.humidity ?? null,
            sunrise: data.sys?.sunrise ?? null,
            sunset: data.sys?.sunset ?? null,
            coord: {
                lon: data.coord?.lon ?? null,
                lat: data.coord?.lat ?? null,
            },
            raw: data,
        }

        return adapted
    }
}
