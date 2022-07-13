import { Response } from "express";

interface CustomJson {
  success: boolean;
  data?: any;
  message?: string;
}

type Send<T = Response> = (body?: CustomJson) => T;

export interface CustomResponse extends Response {
  json: Send<this>;
}
