// src/services/strategies/IWeatherStrategy.ts

export interface IWeatherStrategy {
    execute(city: string, demoFail?: boolean): Promise<any>
}