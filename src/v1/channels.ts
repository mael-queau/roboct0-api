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

router
  .route("/:id")
  .get(async (req, res) => {
    const { id } = req.params;
    const result = await db.twitch.findUnique({
      where: {
        twitchId: id,
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
          id: result.twitchId,
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

      const existing = await db.twitch.findUnique({
        where: {
          twitchId: id,
        },
      });

      if (existing === null) {
        res.status(404).json({
          success: false,
          message: "This Twitch channel isn't registered with us.",
        });
      } else {
        const result = await db.twitch.update({
          where: {
            twitchId: id,
          },
          data: {
            enabled: parsedBody.enabled ?? !existing.enabled,
          },
          select: {
            twitchId: true,
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
            id: result.twitchId,
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
    const result = await db.twitch.delete({
      where: {
        twitchId: id,
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
  });

router
  .route(`/:id/guilds`)
  .get(async (req, res) => {
    const { id } = req.params;
    const result = await db.twitch.findUnique({
      where: {
        twitchId: id,
      },
      select: {
        _count: {
          select: {
            guilds: true,
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
        data: { guild_count: result._count.guilds },
      });
    }
  })
  .post(async (req, res) => {
    const { id } = req.params;

    const bodyValidator = z.object({
      guild_id: z.string(),
    });

    try {
      const parsedBody = bodyValidator.parse(req.body);

      const existing = await db.twitch.findUnique({
        where: {
          twitchId: id,
        },
        include: {
          guilds: {
            select: {
              guildId: true,
            },
          },
        },
      });

      if (existing === null) {
        res.status(404).json({
          success: false,
          message: "This Twitch channel isn't registered with us.",
        });
      } else if (
        existing.guilds.find((g) => g.guildId === parsedBody.guild_id)
      ) {
        res.status(400).json({
          success: false,
          message: "This Twitch channel is already present in this guild.",
        });
      } else if (!existing.enabled) {
        res.status(400).json({
          success: false,
          message: "This Twitch channel is disabled.",
        });
      } else {
        const result = await db.twitch.update({
          where: {
            twitchId: id,
          },
          data: {
            guilds: {
              connect: {
                guildId: parsedBody.guild_id,
              },
            },
          },
          select: {
            twitchId: true,
            username: true,
            registeredAt: true,
            guilds: {
              include: {
                _count: true,
              },
            },
          },
        });
        res.status(201).json({
          success: true,
          data: {
            id: result.twitchId,
            username: result.username,
            registered_at: result.registeredAt,
            guild_count: result.guilds.length,
          },
        });
      }
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "The request body is invalid.",
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

    const bodyValidator = z.object({
      guild_id: z.string(),
    });

    try {
      const parsedBody = bodyValidator.parse(req.body);

      const existing = await db.twitch.findUnique({
        where: {
          twitchId: id,
        },
        include: {
          guilds: {
            select: {
              guildId: true,
            },
          },
        },
      });

      if (existing === null) {
        res.status(404).json({
          success: false,
          message: "This Twitch channel isn't registered with us.",
        });
      } else if (!existing.enabled) {
        res.status(400).json({
          success: false,
          message: "This Twitch channel is disabled.",
        });
      } else if (
        !existing.guilds.find((g) => g.guildId === parsedBody.guild_id)
      ) {
        res.status(400).json({
          success: false,
          message: "This Twitch channel is not present in this guild.",
        });
      } else {
        const result = await db.twitch.update({
          where: {
            twitchId: id,
          },
          data: {
            guilds: {
              disconnect: {
                guildId: parsedBody.guild_id,
              },
            },
          },
          select: {
            twitchId: true,
            username: true,
            registeredAt: true,
            guilds: {
              include: {
                _count: true,
              },
            },
          },
        });

        res.json({
          success: true,
          data: {
            id: result.twitchId,
            username: result.username,
            registered_at: result.registeredAt,
            guild_count: result.guilds.length,
          },
        });
      }
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "The request body is invalid.",
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
