import { WeatherRoute } from "./weatherRoute";

/**
 * Init Express REST routes
 * @returns {void}
 */

class Routes {
  private prefix: string = "/api/v1/vopak";
  public routes(app): void {
    app.use(this.prefix, new WeatherRoute().router);
  }
}
export { Routes };
