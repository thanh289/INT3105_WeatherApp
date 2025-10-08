import { Request, Response } from "express";
import { WeatherService } from "../services/weatherService";

import moment from "moment";
class WeatherController {
  public weatherService: WeatherService;
  public dt: any;
  constructor() {
    this.weatherService = new WeatherService();
    this.dt = moment().format("YYYY-MM-DD");
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
      let limit: number = 20;
      let page: number = 1;

      if (typeof req.query.limit !== "undefined") {
        limit = parseInt(req.query.limit as string);
      }

      if (typeof req.query.page !== "undefined") {
        page = parseInt(req.query.page as string);
      }

      const response = await this.weatherService.getWeathers(
        this.dt,
        limit,
        page
      );

      if (response) {
        return res.status(200).send({
          message: "success",
          payload: response[0],
          currentPage: page,
          totalPages: Math.ceil(Number(response[1]) / limit),
          totalRecord: response[1],
        });
      } else {
        return res
          .status(404)
          .send({ message: "No record found in the database" });
      }
    } catch (err) {
      res.status(500).send({
        message: "Error occured while retriving  the data " + err.message,
      });
    }
  };

  /**
   * Get weather of a specific city of present date
   * @param req
   * @param res
   * @returns http response
   */

  public getWeather = async (req: Request, res: Response) => {
    try {
      if (!req.query.city || typeof req.query.city !== "string") {
        return res.status(400).send({ message: "City is required and must be a string" });
      }
      const city: string = req.query.city.trim().toLowerCase();
      const demoFail = req.query.demoFail === "true";

      //first going to check whether data is already exists or not
      const isExists = await this.weatherService.getWeather(this.dt, city);

      if (isExists) {
        console.log(`[DB] Found weather for city "${city}" on date ${this.dt}`);
        return res.status(200).send({ message: "success (from DB)", payload: isExists });
      } else {
        //Now fetching weather information from OpenWeather based on CITY
        console.log(`[API] Fetching weather for city "${city}" from OpenWeather API...`);
        const response = await this.weatherService.getWeatherFromAPI(city, demoFail);

        // Check fallback
        if (response.message) {
          return res.status(503).send({ message: response.message, payload: response });
        }

        //Extracting data from the response
        const country: string = response.sys.country;
        const dt = moment.unix(response.dt).utcOffset(response.timezone / 60).format("YYYY-MM-DD");
        let temp: number = response.main.temp;
        let pressure: number = response.main.pressure;
        let minTemp: number = response.main.temp_min;
        let maxTemp: number = response.main.temp_max;
        let humidity: number = response.main.humidity;
        let sunrise: number = response.sys.sunrise;
        let sunset: number = response.sys.sunset;
        let type: string = response.weather[0].main;

        let coord: object = response.coord;
        let wind: object = response.wind;

        //creating the object as per mongoDB schema

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
        };

        const result = await this.weatherService.createWeather(data);

        if (result) {
          return res.status(200).send({ message: "success (from API)", payload: result });
        } else {
          return res
            .status(404)
            .send({ message: `No record found with this id = ${city}` });
        }
      }
    } catch (err) {
      res.status(500).send({
        message: "Error occured while retriving  the data " + err.message,
      });
    }
  };

  /**
   * GET average tempreture of a location based on for a given month of the year
   * @param req
   * @param res
   * @returns  http response
   */

  public getAvgTemp = async (req: Request, res: Response) => {
    try {
      const city: string = req.params.city;
      const year: number = parseInt(req.params.year);
      const month: number = parseInt(req.params.month);
      const start = moment({ year, month: month - 1, day: 1 }).format("YYYY-MM-DD");
      const end = moment(start).endOf("month").format("YYYY-MM-DD");  

      const response = await this.weatherService.getAvgTemp(city, start, end);
      console.log(response);
      if (response) {
        return res.status(200).send({ message: "success", payload: response });
      } else {
        return res
          .status(404)
          .send({ message: "No record found in the database" });
      }
    } catch (err) {
      res.status(500).send({
        message: "Error occured while retriving  the data " + err.message,
      });
    }
  };

  /**
   * POST weather
   * @param req
   * @param res
   * @returns http response
   */

  public createWeather = async (req: Request, res: Response) => {
    try {
      const response = await this.weatherService.createWeather(req.body);
      if (response) {
        return res.status(201).send({ message: "success", payload: response });
      } else {
        return res.status(201).send({
          message: "Error occured while saving the data",
        });
      }
    } catch (err) {
      res.status(500).send({
        message: "Error occured while saving the data " + err.message,
      });
    }
  };
}

export { WeatherController };
