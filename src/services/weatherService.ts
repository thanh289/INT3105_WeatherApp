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
  private openWeatherCB: CircuitBreaker
  private weatherApiCB: CircuitBreaker
  private circuitBreakers: Map<string, CircuitBreaker>

  constructor() {
    // Config for Circuit Breaker
    const options = {
      timeout: 20000,                 // request > 20s -> fail
      errorThresholdPercentage: 60,   // 60% request fail -> CB open
      resetTimeout: 5000,             // after 5s (for demo) -> half-open
      rollingCountTimeout: 30000,     // time for window = 30s
      volumeThreshold: 3,             // minimum request need to evaluate during the time of window
    }

    // Create separate CB for each provider
    this.openWeatherCB = new CircuitBreaker(
      (city: string, demoFail?: boolean) => this.fetchFromProvider(city, demoFail, "openweather"),
      { ...options, name: "OpenWeatherCB" }
    )

    this.weatherApiCB = new CircuitBreaker(
      (city: string, demoFail?: boolean) => this.fetchFromProvider(city, demoFail, "weatherapi"),
      { ...options, name: "WeatherApiCB" }
    )

    // Store in map for easy access
    this.circuitBreakers = new Map([
      ["openweather", this.openWeatherCB],
      ["weatherapi", this.weatherApiCB],
    ])

    // Setup event listeners for each CB
    this.setupCircuitBreakerEvents(this.openWeatherCB, "OpenWeather")
    this.setupCircuitBreakerEvents(this.weatherApiCB, "WeatherAPI")

    // Setup fallback for each CB
    this.openWeatherCB.fallback(async (city: string) => {
      console.warn(`[CB-OpenWeather] Fallback triggered for city "${city}"`)
      throw new Error("OpenWeather circuit breaker open")
    })

    this.weatherApiCB.fallback(async (city: string) => {
      console.warn(`[CB-WeatherAPI] Fallback triggered for city "${city}"`)
      throw new Error("WeatherAPI circuit breaker open")
    })
  }

  /**
   * Setup event listeners for a circuit breaker
   */
  private setupCircuitBreakerEvents(cb: CircuitBreaker, providerName: string) {
    cb.on("open", () => console.warn(`[CB-${providerName}] Circuit opened!`))
    cb.on("halfOpen", () => console.info(`[CB-${providerName}] Circuit half-open, testing API`))
    cb.on("close", () => console.info(`[CB-${providerName}] Circuit closed, API OK`))
    cb.on("fallback", () => console.warn(`[CB-${providerName}] Fallback executed`))
  }

  /**
   * Wrapper used by circuit breaker. It will:
   *  - optionally simulate failure when demoFail=true
   *  - obtain provider from factory
   *  - call provider.getWeather and map provider data into the shape your controller expects
   */
  public fetchFromProvider = async (city: string, demoFail?: boolean, providerName?: string, retries = 3) => {
    for (let i = 1; i <= retries; i++) {
      try {
        console.log(`[Retry] Attempt ${i} for city "${city}" (provider=${providerName ?? "openweather"})`)
        if (demoFail && providerName === "openweather") {
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

        console.log(`[Success] Got weather from ${providerName} for "${city}"`)
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
      ? [providerName, "openweather", "weatherapi"].filter(
        (p, i, arr) => arr.indexOf(p) === i
      ) // Remove duplicates
      : ["openweather", "weatherapi"]

    // let lastError: Error | null = null


    for (const provider of providerOrder) {
      try {
        console.log(`[Service] Trying provider "${provider}" for city "${city}"`)
        const cb = this.circuitBreakers.get(provider)
        if (!cb) {
          console.warn(`[Service] No circuit breaker found for provider "${provider}"`)
          continue
        }

        // Fire the circuit breaker for this specific provider
        const result = await cb.fire(city, demoFail)
        return result // Success!

      } catch (err) {
        if (err instanceof Error) {
          console.warn(`[Service] Provider "${provider}" failed: ${err.message}`)
          // lastError = err
        } else {
          console.warn(`[Service] Provider "${provider}" failed with unknown error:`, err)
          // lastError = new Error("Unknown error")
        }
        // Continue to next provider
      }

    }
    // All providers failed - return fallback response
    console.error("[Service] All providers failed, returning fallback")
    return this.getFallbackResponse(city)
  }

  /**
   * Generate fallback response when all providers fail
   */
  private getFallbackResponse(city: string) {
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
      sys: { country: null, sunrise: null, sunset: null },
      main: { temp: null, pressure: null, temp_min: null, temp_max: null, humidity: null },
      wind: { speed: null, deg: null },
      weather: [{ main: null }],
      message: "All weather providers temporarily unavailable. Please try again later.",
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