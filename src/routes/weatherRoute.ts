import { Router } from "express"
import { WeatherController } from "../controllers/weatherController"

class WeatherRoute {
  public weatherController: WeatherController;
  public router: Router;

  constructor() {
    this.weatherController = new WeatherController()
    this.router = Router()
    this.configRoutes()
  }

  public configRoutes(): void {
    this.router.get("/", this.weatherController.getWeathers)
    this.router.get("/weathers", this.weatherController.getWeather)
    this.router.get(
      "/weathers/:city/:month/:year",
      this.weatherController.getAvgTemp
    )
    this.router.post("/weathers", this.weatherController.createWeather)
  }
}
export { WeatherRoute }
