/* eslint-disable @typescript-eslint/no-unused-vars */
// src/middlewars/apiErrorHandler.ts

import { Request, Response, NextFunction } from "express"

export interface IError {
  status?: number;
  code?: number;
  message?: string;
}

/**
 * NOT_FOUND(404) middleware to catch error response
 *
 * @param  {object}   req
 * @param  {object}   res
 * @param  {function} next
 */
export function notFoundErrorHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.status(404).json({
    success: false,
    error: {
      code: 404,
      message: "Not found",
    },
  })
}

/**
 * Generic error response middleware
 *
 * @param  {object}   err
 * @param  {object}   req
 * @param  {object}   res
 * @param  {function} next
 */
export function errorHandler(
  err: IError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = err.status || 500
  const errorCode = err.code || statusCode
  const errorMessage = err.message || "Internal Server Error"

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: errorMessage,
    },
  })
}
