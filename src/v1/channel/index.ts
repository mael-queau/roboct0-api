import { Router } from "express";
import { z, ZodError } from "zod";
import db from "../../db";
import { handlePrismaError } from "../../helper";

const router = Router({ mergeParams: true });

export default router;

router.get("", (req, res) => {
  const queryValidator = z.object({
    search: z.string().optional(),
    limit: z.number().int().max(0).nullish(),
    offset: z.number().int().max(0).nullish(),
  });
  try {
    const parsedQuery = queryValidator.parse(req.query);
    db.channel
      .findMany({
        where: {
          channelName: {
            contains: parsedQuery.search,
            mode: "insensitive",
          },
        },
        select: {
          channelId: true,
          channelLogin: true,
          channelName: true,
          enabled: true,
          registered: true,
          _count: {
            select: {
              guilds: true,
            },
          },
        },
        take: parsedQuery.limit ?? 10,
        skip: parsedQuery.offset ?? 0,
        orderBy: {
          _relevance: {
            fields: ["channelName"],
            search: parsedQuery.search ?? "",
            sort: "desc",
          },
        },
      })
      .then((result) => {
        res.json(
          result.sort((r1, r2) => {
            return r1._count.guilds - r2._count.guilds;
          })
        );
      })
      .catch((err) => {
        handlePrismaError(err, res);
      });
  } catch (err) {
    if (err instanceof ZodError) res.status(400).send(err.format());
    else res.sendStatus(500);
  }
});

router.get("/:login", (req, res) => {
  const paramsValidator = z.object({
    login: z.string(),
  });
  const parsedParams = paramsValidator.parse(req.params);
  db.channel
    .findUnique({
      where: {
        channelLogin: parsedParams.login,
      },
      select: {
        channelId: true,
        channelName: true,
        enabled: true,
        lastLive: true,
        registered: true,
        _count: {
          select: {
            commands: true,
            guilds: true,
            quotes: true,
            Users: true,
          },
        },
      },
    })
    .then((result) => {
      if (result === null) {
        res.sendStatus(404);
      } else {
        res.json(result);
      }
    })
    .catch((err) => {
      handlePrismaError(err, res);
    });
});
