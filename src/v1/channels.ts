import { PrismaClient } from "@prisma/client";
import { z, ZodError } from "zod";
import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import dayjs from "dayjs";

const db = new PrismaClient();
const router = Router({ mergeParams: true });

export default router;

router.get(
  "/:channelId/",
  (req, res, next) => {
    const schema = z.object({
      params: z.object({
        channelId: z
          .string({
            required_error:
              "You need to provide a channelId to register a channel",
            invalid_type_error: "channelId must be a string",
          })
          .min(1, {
            message: "channelId cannot be an empty string",
          }),
      }),
    });

    try {
      schema.parse(req);
      next();
    } catch (err) {
      if (err instanceof ZodError) res.sendStatus(400);
      else res.sendStatus(500);
    }
  },
  (req, res) => {
    db.channel
      .findUnique({
        where: {
          channelId: req.params.channelId,
        },
        select: {
          channelId: true,
          lastLive: true,
          registered: true,
          enabled: true,
        },
      })
      .then((result) => {
        if (result === null) res.sendStatus(404);
        else res.status(200).json(result);
      })
      .catch((err) => {
        console.error(err);
        res.sendStatus(500);
      });
  }
);

router.post(
  "/",
  (req, res, next) => {
    const schema = z.object({
      body: z.object({
        channelId: z
          .string({
            required_error:
              "You need to provide a channelId to register a channel",
            invalid_type_error: "channelId must be a string",
          })
          .min(1, {
            message: "channelId cannot be an empty string",
          }),
      }),
    });
    try {
      schema.parse(req);
      next();
    } catch (err) {
      if (err instanceof ZodError) res.sendStatus(400);
      else res.sendStatus(500);
    }
  },
  (req, res) => {
    db.channel
      .create({
        data: {
          channelId: req.body.channelId.toLowerCase(),
        },
        select: {
          channelId: true,
          lastLive: true,
          registered: true,
          enabled: true,
        },
      })
      .then((result) => res.status(204).json(result))
      .catch((err) => {
        console.error(err);
        if (err instanceof PrismaClientKnownRequestError) {
          switch (err.code) {
            case "P2002":
              res.status(409).json({
                error: "This Twitch channel has already been registered",
                link: `/channels/${req.body.channelId}`,
              });
              break;
            default:
              res.status(400);
              break;
          }
          return;
        }
        res.status(500);
      });
  }
);

router.patch(
  "/:channelId",
  (req, res, next) => {
    const schema = z.object({
      params: z.object({
        channelId: z
          .string({
            required_error:
              "You need to provide a channelId to register a channel",
            invalid_type_error: "channelId must be a string",
          })
          .min(1, {
            message: "channelId cannot be an empty string",
          }),
      }),
      body: z.object({
        lastLive: z.string().refine((v) => dayjs(v).isValid()),
      }),
    });

    try {
      schema.parse(req);
      next();
    } catch (err) {
      if (err instanceof ZodError) res.sendStatus(400);
      else res.status(500);
    }
  },
  (req, res) => {
    db.channel
      .update({
        data: {
          lastLive: req.body.lastLive,
        },
        where: {
          channelId: req.params.channelId,
        },
        select: {
          channelId: true,
          lastLive: true,
          registered: true,
          enabled: true,
        },
      })
      .then((result) => res.status(200).json(result));
  }
);

router.delete(
  "/:channelId",
  (req, res, next) => {
    const schema = z.object({
      params: z.object({
        channelId: z
          .string({
            required_error:
              "You need to provide a channelId to register a channel",
            invalid_type_error: "channelId must be a string",
          })
          .min(1, {
            message: "channelId cannot be an empty string",
          }),
      }),
    });

    try {
      schema.parse(req);
      next();
    } catch (err) {
      if (err instanceof ZodError) res.sendStatus(400);
      else res.sendStatus(500);
    }
  },
  (req, res) => {
    db.channel
      .delete({
        where: {
          channelId: req.params.channelId,
        },
      })
      .then(() => res.sendStatus(200))
      .catch((err) => {
        if (err instanceof PrismaClientKnownRequestError) {
          switch (err.code) {
            case "P2025":
              res.sendStatus(404);
              break;
            default:
              res.sendStatus(400);
              break;
          }
        } else {
          console.error(err);
          res.sendStatus(500);
        }
      });
  }
);
