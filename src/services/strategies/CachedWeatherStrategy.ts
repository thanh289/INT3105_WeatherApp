// src/services/strategies/CachedWeatherStrategy.ts

import { Weather } from "../../schemas/weatherModel"
import { IWeatherStrategy } from "./IWeatherStrategy"
import { WeatherProviderFactory } from "../providers/WeatherProviderFactory"
import { IProviderWeatherData } from "../providers/IWeatherProvider"
import moment from "moment"
import { WeatherResponseAdapter } from "services/adapters/WeatherResponseAdapter"

/**
 * Cached Strategy: Check DB first, then fetch from API if needed
 * Use when: You want to minimize API calls and cost
 */
export class CachedWeatherStrategy implements IWeatherStrategy {
    async execute(city: string, demoFail?: boolean): Promise<any> {
        console.log(`[Strategy-Cached] Checking cache for "${city}"`)

        const today = moment().format("YYYY-MM-DD")

        // Check if data exists in DB (cache)
        const cached = await this.getFromCache(city, today)

        if (cached) {
            console.log(`[Strategy-Cached] Cache HIT for "${city}"`)
            return WeatherResponseAdapter.adaptFromDB(cached, "cached")
        }

        // Cache MISS - fetch from API
        console.log(`[Strategy-Cached] Cache MISS for "${city}", fetching from API`)

        try {
            if (demoFail) {
                throw new Error("[Demo] Cached strategy API failure")
            }

            const provider = WeatherProviderFactory.create("openweather")
            const providerData: IProviderWeatherData = await provider.getWeather(city)

            // Save to DB (cache for future requests)
            await this.saveToCache(providerData, city, today)
            console.log(`[Strategy-Cached] Saved to cache for "${city}"`)

            return WeatherResponseAdapter.adapt(providerData, city, "openweather", "cached", { cacheHit: false })
        } catch (err: any) {
            console.error(`[Strategy-Cached] Failed to fetch: ${err.message}`)
            throw err
        }
    }

    /**
   * Get weather from database cache
   */
    private async getFromCache(city: string, dt: string) {
        return await Weather.findOne({
            city: { $regex: city, $options: "i" },
            dt,
        }).exec()
    }

    /**
     * Save weather data to database cache
     */
    private async saveToCache(providerData: IProviderWeatherData, city: string, dt: string) {
        const data = {
            forecast: {
                type: providerData.raw?.weather?.[0]?.main ?? null,
                temp: providerData.temp,
                minTemp: providerData.minTemp,
                maxTemp: providerData.maxTemp,
                pressure: providerData.pressure,
                humidity: providerData.humidity,
                sunrise: providerData.sunrise,
                sunset: providerData.sunset,
                wind: {
                    speed: providerData.raw?.wind?.speed ?? null,
                    deg: providerData.raw?.wind?.deg ?? null,
                },
            },
            coord: providerData.coord,
            city: city.toLowerCase(),
            country: providerData.country,
            dt,
        }

        await Weather.create(data)
    }
}