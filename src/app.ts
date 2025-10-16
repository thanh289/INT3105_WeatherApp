import express from "express"
import cors from "cors"
import compression from "compression"
import helmet from "helmet"
import { Routes } from "./routes/index"
import connectDB from "./db/connectDB"
import logger from "./utils/logger"

import { config } from "dotenv"  // automatically read .env 
config()                         // add .env into process.env   

import {
  errorHandler,
  notFoundErrorHandler,
} from "./middlewars/apiErrorHandler"

export class App {
  public app: express.Application;
  public routes: Routes;

  constructor() {
    this.app = express()
    this.routes = new Routes()

    this.setMiddleWare()
    this.app.use(express.static("public"))
    this.routes.routes(this.app)
    this.app.use(errorHandler)
    this.app.use(notFoundErrorHandler)
    this.connectDatabase()
  }

  /**
   * loading all middlewares
   */
  public setMiddleWare() {
    this.app.use(logger)         // log request
    this.app.use(express.json()) // parse body JSON into req.body
    this.app.use(cors())         // allow API to access frontend
    this.app.use(helmet())       // secure HTTP header, no inline event handler
    this.app.use(compression())  // compress the data received
  }

  // Need to use async since we have to load the database before doing anything
  public async connectDatabase() {
    const db: string = process.env.MONGO_URI
    await connectDB({ db })
  }
}
export default new App().app
