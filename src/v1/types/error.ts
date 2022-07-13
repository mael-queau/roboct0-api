import { Response } from "express";

export type FormattedErrorJson = {
  success: boolean;
  message: string;
};

export class FormattedError extends Error {
  private json: FormattedErrorJson;
  private code: number;

  constructor(message = "Internal server error.", code = 500, success = false) {
    super(message);
    this.json = {
      success,
      message,
    };
    this.code = code;
  }

  get content(): FormattedErrorJson {
    return this.json;
  }

  get status(): number {
    return this.code;
  }

  send(res: Response): void {
    res.status(this.code).json(this.content);
  }
}
