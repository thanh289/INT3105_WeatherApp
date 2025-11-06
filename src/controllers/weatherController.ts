// src/controllers/weatherController.ts

import { Request, Response } from "express"
import { WeatherService } from "../services/weatherService"
import moment from "moment"
import { WeatherStrategyFactory } from "services/strategies/WeatherStrategyFactory"

class WeatherController {
  public weatherService: WeatherService
  public dt: any

  constructor() {
    this.weatherService = new WeatherService()
    this.dt = moment().format("YYYY-MM-DD")
  }

  /**
   * Get list of weathers of present date
   * @route GET
   * @param req
   * @param res
   * @returns http response
   */
  public getWeathers = async (req: Request, res: Response) => {
    try {
      let limit = 20
      let page = 1

      if (typeof req.query.limit !== "undefined") {
        limit = parseInt(req.query.limit as string)
      }

      if (typeof req.query.page !== "undefined") {
        page = parseInt(req.query.page as string)
      }

      const response = await this.weatherService.getWeathers(
        this.dt,
        limit,
        page
      )

      if (response && response[0]) {
        return res.status(200).send({
          message: "success",
          payload: response[0],
          currentPage: page,
          totalPages: Math.ceil(Number(response[1]) / limit),
          totalRecord: response[1],
        })
      } else {
        return res
          .status(404)
          .send({ message: "No record found in the database" })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      res.status(500).send({
        message: "Error occured while retriving the data " + errorMessage,
      })
    }
  }

  /**
   * Get weather of a specific city of present date
   * @param req
   * @param res
   * @returns http response
   */
  public getWeather = async (req: Request, res: Response) => {
    try {
      if (!req.query.city || typeof req.query.city !== "string") {
        return res.status(400).send({ message: "City is required and must be a string" })
      }

      const city: string = req.query.city.trim().toLowerCase()
      const demoFail = req.query.demoFail === "true"
      const strategyName = (req.query.strategy as string) || "reliable"

      console.log(`[Controller] Fetching weather for "${city}" using strategy "${strategyName}"`)

      // Create strategy based on user's choice
      const strategy = WeatherStrategyFactory.create(strategyName)

      // Execute the strategy
      const response = await strategy.execute(city, demoFail)

      // Check if it's a fallback response
      if (response.message && response.message.includes("unavailable")) {
        return res.status(503).send({
          message: `Weather data unavailable (strategy: ${strategyName})`,
          payload: response
        })
      }

      // Extract data for DB storage (only if from API, not from cache)
      if (response._strategy !== "cached" || !response._cacheHit) {
        const country: string = response.sys.country
        const dt = moment.unix(response.dt).format("YYYY-MM-DD")
        const temp: number = response.main.temp
        const pressure: number = response.main.pressure
        const minTemp: number = response.main.temp_min
        const maxTemp: number = response.main.temp_max
        const humidity: number = response.main.humidity
        const sunrise: number = response.sys.sunrise
        const sunset: number = response.sys.sunset
        const type: string = response.weather[0].main

        const coord: object = response.coord
        const wind: object = response.wind

        // Save to DB (skip if already cached)
        if (response._strategy !== "cached") {
          const data = {
            forecast: {
              type,
              temp,
              minTemp,
              maxTemp,
              pressure,
              humidity,
              sunrise,
              sunset,
              wind,
            },
            coord,
            city,
            country,
            dt,
          }

          await this.weatherService.createWeather(data)
          console.log(`[Controller] Saved weather data for "${city}" to database`)
        }
      }

      return res.status(200).send({
        message: `success (strategy: ${strategyName})`,
        payload: response
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      console.error('[Controller Error]', errorMessage)
      res.status(500).send({
        message: "Error occurred while retrieving the data: " + errorMessage,
      })
    }
  }



  /**
   * GET average temperature of a location for a given month of the year
   * @param req
   * @param res
   * @returns http response
   */
  public getAvgTemp = async (req: Request, res: Response) => {
    try {
      const city: string = req.params.city
      const year: number = parseInt(req.params.year)
      const month: number = parseInt(req.params.month)

      if (!city || isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).send({
          message: "Invalid parameters. City, valid month (1-12), and year are required"
        })
      }

      const start = moment({ year, month: month - 1, day: 1 }).format("YYYY-MM-DD")
      const end = moment(start).endOf("month").format("YYYY-MM-DD")

      const response = await this.weatherService.getAvgTemp(city, start, end)
      console.log(response)

      if (response && response.length > 0) {
        return res.status(200).send({ message: "success", payload: response })
      } else {
        return res
          .status(404)
          .send({ message: "No record found in the database for the specified period" })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      res.status(500).send({
        message: "Error occured while retrieving the data: " + errorMessage,
      })
    }
  }



  /**
   * POST weather
   * @param req
   * @param res
   * @returns http response
   */
  public createWeather = async (req: Request, res: Response) => {
    try {
      const response = await this.weatherService.createWeather(req.body)
      if (response) {
        return res.status(201).send({ message: "success", payload: response })
      } else {
        return res.status(400).send({
          message: "Error occured while saving the data",
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      res.status(500).send({
        message: "Error occured while saving the data: " + errorMessage,
      })
    }
  }
}

export { WeatherController }