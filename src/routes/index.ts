// src/routes/index.ts

import { Application } from "express"
import { WeatherRoute } from "./weatherRoute.js"

/**
 * Init Express REST routes
 * @returns {void}
 */
class Routes {
  private prefix = "/api/v1/vopak"

  public routes(app: Application): void {
    app.use(this.prefix, new WeatherRoute().router)
  }
}

export { Routes }