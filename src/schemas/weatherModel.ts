import { Document, Model, model, Schema } from "mongoose";

export interface IWind {
  speed: number;
  deg: number;
}
export interface IForecast {
  type: string;
  temp: number;
  minTemp: number;
  maxTemp: number;
  pressure: number;
  humidity: number;
  sunrise: number;
  sunset: number;
  wind: IWind;
}

export interface ICoord {
  lon: number;
  lat: number;
}

export interface IWeather extends Document {
  id?: string;          // Optional, mongoose will create
  forecast: IForecast;
  coord: ICoord;
  city: string;
  country: string;
  dt: string;
}

const WeatherSchema: Schema = new Schema(
  {
    forecast: {
      type: { type: String },
      temp: { type: Number },
      minTemp: { type: Number },
      maxTemp: { type: Number },
      pressure: { type: Number },
      humidity: { type: Number },
      sunrise: { type: Number },
      sunset: { type: Number },

      wind: {
        speed: { type: Number },
        deg: { type: Number },
      },
    },

    coord: {
      lon: { type: Number },
      lat: { type: Number },
    },

    city: { type: String },
    country: { type: String },
    dt: {
      type: String,
    },
  },

  { timestamps: true }
);

// each document of Weather wil have type IWeather
export const Weather: Model<IWeather> = model("Weather", WeatherSchema);


// Interface - only exist in TypeScript, just for typecheck, not really effect MongoDB        (IForecast..)
// Schema    - Define the structure of a document in MongoDB, we can use nested object        (WeatherSchema)
// Model     - a bridge between code and MongoDB, have method like save(), find(), update()   (Weather)
// Document  - data in database, base on the structure of Schema                              (IWeather)