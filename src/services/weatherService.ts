import { Weather, IWeather } from "../schemas/weatherModel"
import axios from "axios"
import CircuitBreaker from "opossum"
import moment from "moment"
import { config } from "dotenv"
config()



class WeatherService {

  private openWeatherBreaker: CircuitBreaker;
  constructor() {

    // config for CB
    const options = {
      timeout: 20000,                 // request > ?s -> fail
      errorThresholdPercentage: 50,   // 50% request fail -> CB open
      resetTimeout: 10000,            // after 10s (for demo) -> half-open
      rollingCountTimeout: 30000,     // time for window = 30s,
      volumeThreshold: 2,             // minium request need to evaluate
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
  };

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
  };

  public getWeatherFromAPI = async (city: string, demoFail?: boolean): Promise<any> => {
    try {
      return await this.openWeatherBreaker.fire(city, demoFail)
    } catch (err) {
      console.error("[CB] API call failed:", err.message)
      throw new Error("OpenWeather API not available currently. Please try again later.")
    }
  };

  /**
   *
   * @param dt
   * @param limit
   * @param page
   * @returns
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
      // Weather.countDocuments().exec(),
      Weather.countDocuments({ dt }).exec(),
    ]

    // all promises in array run parallel, return when all done
    return await Promise.all(promises)
  };

  /**
   *
   * @param dt
   * @param city
   * @returns
   */
  public getWeather = async (dt: string, city: string): Promise<IWeather> => {
    return await Weather.findOne({
      // string contain 'city', i for ignore case (upper or lower)
      city: { $regex: city, $options: "i" },
      dt,
    }).exec()  // query and return Promise

  };

  /**
   *
   * @param city
   * @param start
   * @param end
   * @returns
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
          _id: "$city", // need id for group
          city: { $first: "$city" },
          avgTemp: { $avg: "$forecast.temp" },
        },
      },
    ])
  };

  /**
   *
   * @param payload
   * @returns
   */
  public createWeather = async (payload: any): Promise<IWeather> => {
    return Weather.create(payload)
  };


}

export { WeatherService }
