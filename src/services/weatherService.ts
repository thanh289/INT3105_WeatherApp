// src/services/weatherService.ts
// only for getWeathers, getAvgTemp, createWeather 

import { Weather, IWeather } from "../schemas/weatherModel"
// import axios from "axios"s
import { config } from "dotenv"
config()



class WeatherService {

  constructor() {

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