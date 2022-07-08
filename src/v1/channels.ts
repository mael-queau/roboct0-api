import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { Request, Router } from "express";
import { CustomResponse } from "./helper";
import { z, ZodError } from "zod";

const router = Router();
export default router;

const prisma = new PrismaClient();

router.get("/channels", async (req: Request, res: CustomResponse) => {
  const queryValidator = z.object({
    search: z.string().optional(),
    page: z
      .string()
      .default("0")
      .refine(
        (s) => /^[0-9]+$/.test(s) && parseInt(s) >= 0,
        "Page must be a positive integer"
      )
      .transform((s) => parseInt(s)),
  });

  try {
    const parsedQuery = queryValidator.parse(req.query);

    // Order by number of guilds that have added the channel.
    const results = await prisma.channel.findMany({
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
      take: 10,
      skip: 10 * parsedQuery.page,
    });

    res.json({
      success: true,
      data: results,
    });
  } catch (e) {
    if (e instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: "The query parameters are invalid.",
        data: e.format(),
      });
    } else {
      console.error(e);
      res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  }
});

router
  .route("/channels/:channelId")
  .get(async (req: Request, res: CustomResponse) => {
    if (!req.params.channelId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "Invalid channel ID.",
      });
      return;
    }

    const { channelId } = req.params;

    try {
      const result = await prisma.channel.findUnique({
        where: {
          channelId,
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
    } catch (e) {
      console.error(e);
      res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  })
  .patch(async (req: Request, res: CustomResponse) => {
    if (!req.params.channelId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "Invalid channel ID.",
      });
      return;
    }

    const { channelId } = req.params;

    const bodyValidator = z.object({
      enabled: z.boolean().optional(),
    });

    try {
      const parsedBody = bodyValidator.parse(req.body);

      const existing = await prisma.channel.findUnique({
        where: {
          channelId,
        },
      });

      if (existing === null) {
        res.status(404).json({
          success: false,
          message: "This Twitch channel isn't registered with us.",
        });
      } else {
        const result = await prisma.channel.update({
          data: {
            enabled: parsedBody.enabled ?? !existing.enabled,
          },
          where: {
            channelId,
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
          data: e.format(),
        });
      } else {
        console.error(e);
        res.status(500).json({
          success: false,
          message: "Internal server error.",
        });
      }
    }
  })
  .delete(async (req: Request, res: CustomResponse) => {
    if (!req.params.channelId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "Invalid channel ID.",
      });
      return;
    }

    const { channelId } = req.params;

    try {
      const result = await prisma.channel.delete({
        where: {
          channelId,
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
          message: "Internal server error.",
        });
      }
    }
  });
