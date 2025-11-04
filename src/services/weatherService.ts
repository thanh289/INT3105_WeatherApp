// src/services/weatherService.ts

import { Weather, IWeather } from "../schemas/weatherModel"
import axios from "axios"
import CircuitBreaker from "opossum"
import moment from "moment"
import { config } from "dotenv"
config()

class WeatherService {
  private openWeatherBreaker: CircuitBreaker

  constructor() {
    // Config for Circuit Breaker
    const options = {
      timeout: 20000,                 // request > 20s -> fail
      errorThresholdPercentage: 50,   // 50% request fail -> CB open
      resetTimeout: 10000,            // after 10s (for demo) -> half-open
      rollingCountTimeout: 30000,     // time for window = 30s
      volumeThreshold: 2,             // minimum request need to evaluate
    }

    this.openWeatherBreaker = new CircuitBreaker(this.fetchWithRetry.bind(this), options)

    this.openWeatherBreaker.fallback(async (city: string) => {
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

    this.openWeatherBreaker.on("open", () => console.warn("[CB] Circuit opened!"))
    this.openWeatherBreaker.on("halfOpen", () => console.info("[CB] Circuit half-open, test API"))
    this.openWeatherBreaker.on("close", () => console.info("[CB] Circuit closed, API OK"))
  }

  public getDataFromOpenWeatherAPI = async (city: string): Promise<any> => {
    const base_url: string =
      process.env.WEATHER_API +
      `?q=${city}` +
      "&units=metric&appid=" +
      `${process.env.APP_ID}`

    const res = await axios.get(base_url)
    return res.data
  }

  // Manual retry
  public fetchWithRetry = async (city: string, demoFail?: boolean, retries = 3) => {
    for (let i = 1; i <= retries; i++) {
      try {
        console.log(`[Retry] Attempt ${i} for city "${city}"`)
        if (demoFail) {
          throw new Error(`[Demo] Simulating API failure on attempt ${i} for city "${city}"`)
        }
        return await this.getDataFromOpenWeatherAPI(city)
      } catch (err: any) {
        console.warn(`[Retry] Attempt ${i} failed: ${err.message}`)
        if (i === retries) throw err
        await new Promise((r) => setTimeout(r, 1000 * i))
      }
    }
  }

  public getWeatherFromAPI = async (city: string, demoFail?: boolean): Promise<any> => {
    try {
      return await this.openWeatherBreaker.fire(city, demoFail)
    } catch (err) {
      if (err instanceof Error) {
        console.error("[CB] API call failed:", err.message)
      } else {
        console.error("[CB] API call failed with unknown error:", err)
      }
      throw new Error("OpenWeather API not available currently. Please try again later.")
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