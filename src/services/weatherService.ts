// src/services/weatherService.ts

import { Weather, IWeather } from "../schemas/weatherModel"
// import axios from "axios"
import CircuitBreaker from "opossum"
import moment from "moment"
import { config } from "dotenv"
config()

import { WeatherProviderFactory } from "./providers/WeatherProviderFactory"
import { IProviderWeatherData } from "./providers/IWeatherProvider"

class WeatherService {
  private CBreaker: CircuitBreaker

  constructor() {
    // Config for Circuit Breaker
    const options = {
      timeout: 20000,                 // request > 20s -> fail
      errorThresholdPercentage: 60,   // 60% request fail -> CB open
      resetTimeout: 5000,             // after 5s (for demo) -> half-open
      rollingCountTimeout: 30000,     // time for window = 30s
      volumeThreshold: 3,             // minimum request need to evaluate during the time of window
    }

    this.CBreaker = new CircuitBreaker(this.fetchWithRetry.bind(this), options)

    this.CBreaker.fallback(async (city: string) => {
      console.warn(`[CB] Fallback triggered for city "${city}"`)
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
        dt: moment().format("YYYY-MM-DD"),
        message: "Weather API temporarily unavailable",
      }
    })

    this.CBreaker.on("open", () => console.warn("[CB] Circuit opened!"))
    this.CBreaker.on("halfOpen", () => console.info("[CB] Circuit half-open, test API"))
    this.CBreaker.on("close", () => console.info("[CB] Circuit closed, API OK"))
  }


  /**
   * Wrapper used by circuit breaker. It will:
   *  - optionally simulate failure when demoFail=true
   *  - obtain provider from factory
   *  - call provider.getWeather and map provider data into the shape your controller expects
   */
  public fetchWithRetry = async (city: string, demoFail?: boolean, providerName?: string, retries = 3) => {
    for (let i = 1; i <= retries; i++) {
      try {
        console.log(`[Retry] Attempt ${i} for city "${city}" (provider=${providerName ?? "openweather"})`)
        if (demoFail) {
          throw new Error(`[Demo] Simulating API failure on attempt ${i} for city "${city}"`)
        }

        const provider = WeatherProviderFactory.create(providerName)
        const providerData: IProviderWeatherData = await provider.getWeather(city)

        const adapted = {
          sys: {
            country: providerData.country,
            sunrise: providerData.sunrise,
            sunset: providerData.sunset,
          },
          dt: Math.floor(Date.now() / 1000), // seconds
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
            speed: (providerData.raw && providerData.raw.wind && providerData.raw.wind.speed) ?? null,
            deg: (providerData.raw && providerData.raw.wind && providerData.raw.wind.deg) ?? null,
          },
          weather: [{ main: providerData.raw && providerData.raw.weather && providerData.raw.weather[0] ? providerData.raw.weather[0].main : null }],
          name: providerData.name ?? city,

          _providerRaw: providerData.raw ?? null,
        }

        return adapted

      } catch (err: any) {
        console.warn(`[Retry] Attempt ${i} failed: ${err.message}`)
        if (i === retries) throw err
        await new Promise((r) => setTimeout(r, 1000 * i))
      }
    }
  }

  /**
   * Public method used by controller to get weather from API (via CB)
   * Includes automatic fallback: if primary provider fails, try next one.
   */
  public getWeatherFromAPI = async (city: string, demoFail?: boolean, providerName?: string): Promise<any> => {

    const providerOrder = providerName
      ? [providerName, "openweather", "weatherapi"]
      : ["openweather", "weatherapi"]

    const tried: string[] = []

    for (const provider of providerOrder) {
      if (tried.includes(provider)) continue // skip duplicates
      tried.push(provider)

      try {
        console.log(`[Service] Trying provider "${provider}" for city "${city}"`)
        return await this.CBreaker.fire(city, demoFail, provider)
      } catch (err) {
        if (err instanceof Error) {
          console.warn(`[Service] Provider "${provider}" failed: ${err.message}`)
        } else {
          console.warn("[CB] API call failed with unknown error:", err)
        }

        if (provider === providerOrder.at(-1)) {
          console.error("[Service] All providers failed!")
          throw new Error("All weather providers are unavailable. Please try again later.")
        }
      }

    }


  }

  /**
   * Get all weathers for a specific date with pagination
   * @param dt - Date string
   * @param limit - Number of records per page
   * @param page - Page number
   * @returns Array with [documents, total count]
   */
  public getWeathers = async (
    dt: string,
    limit: number,
    page: number
  ): Promise<Array<IWeather>> => {
    const promises: any = [
      Weather.find({ dt })
        .sort({ dt: -1, city: 1 })  // 1 for asc, -1 for desc
        .limit(limit)
        .skip(limit * page - limit)
        .exec(),
      Weather.countDocuments({ dt }).exec(),
    ]

    // All promises in array run parallel, return when all done
    return await Promise.all(promises)
  }

  /**
   * Get weather from database (doesn't throw error if not found)
   * @param dt - Date string
   * @param city - City name
   * @returns Weather document or null
   */
  public getWeatherFromDB = async (dt: string, city: string): Promise<IWeather | null> => {
    const weather = await Weather.findOne({
      // String contains 'city', i for ignore case (upper or lower)
      city: { $regex: city, $options: "i" },
      dt,
    }).exec()

    return weather
  }

  /**
   * Get weather (throws error if not found - for backwards compatibility)
   * @param dt - Date string
   * @param city - City name
   * @returns Weather document
   */
  public getWeather = async (dt: string, city: string): Promise<IWeather> => {
    const weather = await this.getWeatherFromDB(dt, city)

    if (!weather) {
      throw new Error(`Weather data for ${city} on ${dt} not found.`)
    }

    return weather
  }

  /**
   * Get average temperature for a city in a date range
   * @param city - City name
   * @param start - Start date
   * @param end - End date
   * @returns Array with aggregated data
   */
  public getAvgTemp = async (
    city: string,
    start: string,
    end: string
  ): Promise<Array<IWeather>> => {
    return await Weather.aggregate([
      {
        $match: {
          $and: [
            { city: { $regex: city, $options: "i" } },
            { dt: { $gte: start, $lt: end } },
          ],
        },
      },
      {
        $group: {
          _id: "$city", // Need id for group
          city: { $first: "$city" },
          avgTemp: { $avg: "$forecast.temp" },
        },
      },
    ])
  }

  /**
   * Create a new weather record
   * @param payload - Weather data
   * @returns Created weather document
   */
  public createWeather = async (payload: any): Promise<IWeather> => {
    return Weather.create(payload)
  }
}

export { WeatherService }