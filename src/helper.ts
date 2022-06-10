import {
  PrismaClientInitializationError,
  // PrismaClientKnownRequestError,
  // PrismaClientUnknownRequestError,
  // PrismaClientValidationError,
} from "@prisma/client/runtime";
import { Response } from "express";

export function handlePrismaError(err: Error, res: Response) {
  if (err instanceof PrismaClientInitializationError) {
    res.status(500).send("The database couldn't be reached in time.");
  } else {
    console.error(err);
    res.sendStatus(500);
  }
}
