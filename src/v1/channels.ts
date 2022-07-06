import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { z, ZodError } from "zod";

const router = Router();
export default router;

const db = new PrismaClient();

router.get("", async (req, res) => {
  const queryValidator = z.object({
    search: z.string().optional(),
    limit: z
      .string()
      .default("10")
      .refine(
        (s) => /^[0-9]+$/.test(s) && parseInt(s) <= 100 && parseInt(s) >= 1,
        "Limit must be a number between 1 and 100"
      )
      .transform((s) => parseInt(s)),
    skip: z
      .string()
      .default("0")
      .refine(
        (s) => /^[0-9]+$/.test(s) && parseInt(s) >= 0,
        "Skip must be a positive number"
      )
      .transform((s) => parseInt(s)),
  });

  try {
    const parsedQuery = queryValidator.parse(req.query);
    const results = await db.twitch.findMany({
      select: {
        twitchId: true,
        username: true,
        registeredAt: true,
        _count: {
          select: {
            guilds: true,
          },
        },
      },
      where: {
        enabled: true,
        username: {
          contains: parsedQuery.search,
        },
      },
      orderBy: {
        guilds: {
          _count: "desc",
        },
      },
      take: parsedQuery.limit,
      skip: parsedQuery.skip,
    });
    res.json({
      success: true,
      results: results,
    });
  } catch (e) {
    if (e instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: "The query parameters are invalid.",
        detail: e.format(),
      });
    } else {
      console.error(e);
      res.status(500).json({
        success: false,
        message: "An unexpected error occurred.",
      });
    }
  }
});
