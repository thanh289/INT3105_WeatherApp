// src/services/strategies/ReliableWeatherStrategy.ts

import CircuitBreaker from "opossum"
import { WeatherProviderFactory } from "../providers/WeatherProviderFactory"
import { IWeatherStrategy } from "./IWeatherStrategy"
import { IProviderWeatherData } from "../providers/IWeatherProvider"
import { WeatherResponseAdapter } from "services/adapters/WeatherResponseAdapter"

/**
 * Reliable Strategy: Multiple providers with retry and circuit breaker
 * Use when: Reliability is more important than speed
 */
export class ReliableWeatherStrategy implements IWeatherStrategy {
    private openWeatherCB: CircuitBreaker
    private weatherApiCB: CircuitBreaker

    constructor() {
        const options = {
            timeout: 20000,
            errorThresholdPercentage: 60,
            resetTimeout: 30000,
            rollingCountTimeout: 30000,
            volumeThreshold: 3,
        }

        this.openWeatherCB = new CircuitBreaker(
            (city: string, demoFail?: boolean) => this.fetchWithRetry(city, demoFail, "openweather"),
            { ...options, name: "ReliableStrategy-OpenWeatherCB" }
        )

        this.weatherApiCB = new CircuitBreaker(
            (city: string, demoFail?: boolean) => this.fetchWithRetry(city, demoFail, "weatherapi"),
            { ...options, name: "ReliableStrategy-WeatherApiCB" }
        )

        this.setupCircuitBreakerEvents(this.openWeatherCB, "OpenWeather")
        this.setupCircuitBreakerEvents(this.weatherApiCB, "WeatherAPI")

        this.openWeatherCB.fallback(() => {
            throw new Error("OpenWeather circuit breaker open")
        })

        this.weatherApiCB.fallback(() => {
            throw new Error("WeatherAPI circuit breaker open")
        })
    }

    private setupCircuitBreakerEvents(cb: CircuitBreaker, providerName: string) {
        cb.on("open", () => console.warn(`[Strategy-Reliable][CB-${providerName}] Circuit opened!`))
        cb.on("halfOpen", () => console.info(`[Strategy-Reliable][CB-${providerName}] Circuit half-open`))
        cb.on("close", () => console.info(`[Strategy-Reliable][CB-${providerName}] Circuit closed`))
    }

    async execute(city: string, demoFail?: boolean): Promise<any> {
        console.log(`[Strategy-Reliable] Fetching weather for "${city}" - with retries and fallback`)

        const providers = ["openweather", "weatherapi"]
        // let lastError: Error | null = null

        for (const provider of providers) {
            try {
                console.log(`[Strategy-Reliable] Trying provider "${provider}"`)

                const cb = provider === "openweather" ? this.openWeatherCB : this.weatherApiCB
                const result = await cb.fire(city, demoFail)

                return result
            } catch (err) {
                if (err instanceof Error) {
                    console.warn(`[Strategy-Reliable] Provider "${provider}" failed: ${err.message}`)
                    //   lastError = err
                }
            }
        }

        console.error("[Strategy-Reliable] All providers failed")
        return WeatherResponseAdapter.createFallback(city, "reliable")
    }

    private async fetchWithRetry(city: string, demoFail?: boolean, providerName?: string, retries = 3) {
        for (let i = 1; i <= retries; i++) {
            try {
                console.log(`[Strategy-Reliable][Retry] Attempt ${i}/${retries} for "${city}" (${providerName})`)

                if (demoFail && providerName === "openweather") {
                    throw new Error(`[Demo] Simulating failure for ${providerName}`)
                }

                const provider = WeatherProviderFactory.create(providerName)
                const providerData: IProviderWeatherData = await provider.getWeather(city)

                return WeatherResponseAdapter.adapt(providerData, city, providerName!, "reliable")
            } catch (err: any) {
                console.warn(`[Strategy-Reliable][Retry] Attempt ${i} failed: ${err.message}`)
                if (i === retries) throw err
                await new Promise((r) => setTimeout(r, 1000 * i))
            }
        }
    }

}