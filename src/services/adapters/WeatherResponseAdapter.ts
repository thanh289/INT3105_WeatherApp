// src/services/adapters/WeatherResponseAdapter.ts

import { IProviderWeatherData } from "../providers/IWeatherProvider"

/**
 * Adapter to convert provider data into standardized response format
 * This follows the Adapter Pattern - converting different API formats into one common format
 */
export class WeatherResponseAdapter {
    /**
     * Adapt provider data to standard weather response format
     */
    public static adapt(
        providerData: IProviderWeatherData,
        city: string,
        providerName: string,
        strategyName: string,
        additionalFields?: { cacheHit?: boolean }
    ): any {
        return {
            sys: {
                country: providerData.country,
                sunrise: providerData.sunrise,
                sunset: providerData.sunset,
            },
            dt: Math.floor(Date.now() / 1000),
            timezone: 0,
            main: {
                temp: providerData.temp,
                pressure: providerData.pressure,
                temp_min: providerData.minTemp ?? null,
                temp_max: providerData.maxTemp ?? null,
                humidity: providerData.humidity ?? null,
            },
            coord: {
                lon: providerData.coord?.lon ?? null,
                lat: providerData.coord?.lat ?? null,
            },
            wind: {
                speed: providerData.raw?.wind?.speed ?? null,
                deg: providerData.raw?.wind?.deg ?? null,
            },
            weather: [
                {
                    main: providerData.raw?.weather?.[0]?.main ?? null,
                },
            ],
            name: providerData.name ?? city,
            _provider: providerName,
            _strategy: strategyName,
            ...(additionalFields?.cacheHit !== undefined && { _cacheHit: additionalFields.cacheHit }),
        }
    }

    /**
     * Adapt cached database record to response format
     */
    public static adaptFromDB(cached: any, strategyName: string): any {
        return {
            sys: {
                country: cached.country,
                sunrise: cached.forecast.sunrise,
                sunset: cached.forecast.sunset,
            },
            dt: Math.floor(Date.now() / 1000),
            timezone: 0,
            main: {
                temp: cached.forecast.temp,
                pressure: cached.forecast.pressure,
                temp_min: cached.forecast.minTemp,
                temp_max: cached.forecast.maxTemp,
                humidity: cached.forecast.humidity,
            },
            coord: cached.coord,
            wind: cached.forecast.wind,
            weather: [{ main: cached.forecast.type }],
            name: cached.city,
            _provider: "database",
            _strategy: strategyName,
            _cacheHit: true,
        }
    }

    /**
     * Create fallback response when all providers fail
     */
    public static createFallback(city: string, strategyName: string): any {
        return {
            forecast: {
                type: null,
                temp: null,
                minTemp: null,
                maxTemp: null,
                pressure: null,
                humidity: null,
                sunrise: null,
                sunset: null,
                wind: { speed: null, deg: null },
            },
            coord: { lon: null, lat: null },
            city,
            country: null,
            dt: new Date().toISOString().split("T")[0], // YYYY-MM-DD
            sys: { country: null, sunrise: null, sunset: null },
            main: { temp: null, pressure: null, temp_min: null, temp_max: null, humidity: null },
            wind: { speed: null, deg: null },
            weather: [{ main: null }],
            message: "All weather providers temporarily unavailable. Please try again later.",
            _strategy: strategyName,
        }
    }
}