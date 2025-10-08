import { Weather, IWeather } from "../schemas/weatherModel";
import axios from "axios";
import moment from "moment";
import { config } from "dotenv";
config();

class WeatherService {
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
    ];
    
    // all promises in array run parallel, return when all done
    return await Promise.all(promises);
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
    }).exec();  // query and return Promise

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
    ]);
  };

  /**
   *
   * @param payload
   * @returns
   */
  public createWeather = async (payload: any): Promise<IWeather> => {
    return Weather.create(payload);
  };

  public getDataFromOpenWeatherAPI = async (city: any): Promise<any> => {
    const base_url: string =
      process.env.WEATHER_API +
      `?q=${city}` +
      "&units=metric&appid=" +    // celsius degre
      `${process.env.APP_ID}`;

    const res = await axios.get(base_url);
    const { data } = res;
    return data;
  };
}

export { WeatherService };
