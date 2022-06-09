import { Router } from "express";
import { z, ZodError } from "zod";
import db from "../../db";

const router = Router({ mergeParams: true });

export default router;

router.get("", (req, res) => {
  const query = z.object({
    search: z.string().min(1, "'search' cannot be empty").nullish(),
    limit: z.number().int().max(0).nullish(),
    offset: z.number().int().max(0).nullish(),
  });
  try {
    const parsedQuery = query.parse(req.query);
    db.channel
      .findMany({
        select: {
          channelId: true,
          channelLogin: true,
          channelName: true,
          enabled: true,
          registered: true,
        },
        take: parsedQuery.limit ?? 10,
        skip: parsedQuery.offset ?? 0,
        orderBy: {
          _relevance: {
            fields: ["channelName"],
            search: parsedQuery.search ?? "",
            sort: "asc",
          },
        },
      })
      .then((result) => {
        res.json(result);
      })
      .catch(() => {
        // TODO: error handling
        res.sendStatus(500);
      });
  } catch (err) {
    if (err instanceof ZodError) res.status(400).send(err.format());
    else res.sendStatus(500);
  }
});

router.get("/:login", (req, res) => {
  db.channel
    .findUnique({
      where: {
        channelLogin: `${req.params.login}`,
      },
      select: {
        channelId: true,
        channelName: true,
        enabled: true,
        lastLive: true,
        registered: true,
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
      console.error(err);
    });
});
