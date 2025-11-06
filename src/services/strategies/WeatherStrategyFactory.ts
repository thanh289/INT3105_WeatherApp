// src/services/strategies/WeatherStrategyFactory.ts

import { IWeatherStrategy } from "./IWeatherStrategy"
import { FastWeatherStrategy } from "./FastWeatherStrategy"
import { ReliableWeatherStrategy } from "./ReliableWeatherStrategy"
import { CachedWeatherStrategy } from "./CachedWeatherStrategy"

export class WeatherStrategyFactory {
    private static reliableInstance: ReliableWeatherStrategy | null = null

    public static create(strategyName?: string): IWeatherStrategy {
        const name = (strategyName || "reliable").toLowerCase()

        switch (name) {
            case "fast":
                console.log("[StrategyFactory] Creating FastWeatherStrategy")
                return new FastWeatherStrategy()

            case "reliable":
                console.log("[StrategyFactory] Creating ReliableWeatherStrategy")
                // Reuse instance because CB needs to persist across requests
                if (!this.reliableInstance) {
                    this.reliableInstance = new ReliableWeatherStrategy()
                }
                return this.reliableInstance

            case "cached":
                console.log("[StrategyFactory] Creating CachedWeatherStrategy")
                return new CachedWeatherStrategy()

            default:
                console.warn(`[StrategyFactory] Unknown strategy "${strategyName}", using reliable`)
                if (!this.reliableInstance) {
                    this.reliableInstance = new ReliableWeatherStrategy()
                }
                return this.reliableInstance
        }
    }
}