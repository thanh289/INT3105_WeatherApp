// // src/services/providers/WeatherProviderFactory.ts

import { IWeatherProvider } from "./IWeatherProvider"
import { OpenWeatherProvider } from "./OpenWeatherProvider"
import { WeatherApiProvider } from "./WeatherApiProvider"

export class WeatherProviderFactory {
    public static create(providerName?: string): IWeatherProvider {
        const name = (providerName || "openweather").toLowerCase()

        switch (name) {
            case "openweather":
                return new OpenWeatherProvider()
            case "weatherapi":
                return new WeatherApiProvider()
            default:
                console.warn(`[WeatherProviderFactory] Unknown provider "${providerName}", using OpenWeather by default.`)
                return new OpenWeatherProvider()
        }
    }
}