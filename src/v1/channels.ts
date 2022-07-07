import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { z, ZodError } from "zod";

const router = Router();
export default router;

const db = new PrismaClient();

router.get("/channels", async (req: Request, res: CustomResponse) => {
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
    const results = await db.channel.findMany({
      select: {
        channelId: true,
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

router
  .route("/channels/:id")
  .get(async (req, res) => {
    const { id } = req.params;
    const result = await db.channel.findUnique({
      where: {
        channelId: id,
      },
      include: {
        guilds: {
          select: {
            _count: true,
          },
        },
      },
    });
    if (result === null) {
      res.status(404).json({
        success: false,
        message: "This Twitch channel isn't registered with us.",
      });
    } else {
      res.json({
        success: true,
        data: {
          id: result.channelId,
          username: result.username,
          enabled: result.enabled,
          registered_at: result.registeredAt,
          guild_count: result.guilds.length,
        },
      });
    }
  })
  .patch(async (req, res) => {
    const { id } = req.params;
    const bodyValidator = z.object({
      enabled: z.boolean().optional(),
    });

    try {
      const parsedBody = bodyValidator.parse(req.body);

      const existing = await db.channel.findUnique({
        where: {
          channelId: id,
        },
      });

      if (existing === null) {
        res.status(404).json({
          success: false,
          message: "This Twitch channel isn't registered with us.",
        });
      } else {
        const result = await db.channel.update({
          data: {
            enabled: parsedBody.enabled ?? !existing.enabled,
          },
          where: {
            channelId: id,
          },
          select: {
            channelId: true,
            username: true,
            registeredAt: true,
            enabled: true,
            guilds: {
              select: {
                guildId: true,
              },
            },
          },
        });
        res.json({
          success: true,
          data: {
            id: result.channelId,
            username: result.username,
            enabled: result.enabled,
            registered_at: result.registeredAt,
            guild_count: result.guilds.length,
          },
        });
      }
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
  })
  .delete(async (req, res) => {
    const { id } = req.params;
    try {
      const result = await db.channel.delete({
      where: {
          channelId: id,
      },
    });
    if (result === null) {
      res.status(404).json({
        success: false,
        message: "This Twitch channel isn't registered with us.",
      });
    } else {
      res.json({
        success: true,
        message: "The Twitch channel was successfully deleted.",
      });
    }
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
        res.status(404).json({
          success: false,
          message: "This Twitch channel isn't registered with us.",
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
