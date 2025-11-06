import { WeatherProviderFactory } from "services/providers/WeatherProviderFactory"
import { IWeatherStrategy } from "./IWeatherStrategy"
import { IProviderWeatherData } from "services/providers/IWeatherProvider"
import { WeatherResponseAdapter } from "services/adapters/WeatherResponseAdapter"

/**
 * Fast Strategy: Single provider, no retries, fails fast
 * Use when: Speed is more important than reliability
 */
export class FastWeatherStrategy implements IWeatherStrategy {
    async execute(city: string, demoFail?: boolean): Promise<any> {
        console.log(`[Strategy-Fast] Fetching weather for "${city}" - fast response`)

        try {
            if (demoFail) {
                throw new Error("[Demo] Fast strategy simulated failure")
            }

            const provider = WeatherProviderFactory.create("openweather")
            const providerData: IProviderWeatherData = await provider.getWeather(city)

            return WeatherResponseAdapter.adapt(providerData, city, "openweather", "fast")
        } catch (err: any) {
            console.error(`[Strategy-Fast] Failed quickly: ${err.message}`)
            throw err
        }
    }
}