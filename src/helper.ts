import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
  // PrismaClientKnownRequestError,
  // PrismaClientUnknownRequestError,
  // PrismaClientValidationError,
} from "@prisma/client/runtime";
import { Response } from "express";

/**
 * Handler for Prisma errors in API endpoints
 * @description This sends the proper status code and message depending on the error
 * @param err The Prisma error object
 * @param res The Express Response object
 */
export function handlePrismaError(err: Error, res: Response) {
  if (err instanceof PrismaClientInitializationError) {
    res.status(500).send("The database couldn't be reached in time.");
  } else if (err instanceof PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2021":
        res
          .status(500)
          .send("The server tried to use a database table that doesn't exist.");
    }
  } else {
    console.error(err);
    res.sendStatus(500);
  }
}
