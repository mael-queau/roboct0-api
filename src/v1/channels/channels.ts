import { Request, Router } from "express";
import { z, ZodError } from "zod";
import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { CustomResponse } from "../helper";

const router = Router();
export default router;

const prisma = new PrismaClient();

router.get("/channels", async (req: Request, res: CustomResponse) => {
  // Get a list of registered channels
  // Query parameters:
  // - search: string - Search for channels by name.
  // - page: number - The page number.
  // - include_disabled: boolean - Include disabled channels.
  try {
    const queryValidator = z.object({
      search: z.string().optional(),
      page: z
        .string()
        .default("1")
        .refine(
          (s) => /^[0-9]+$/.test(s) && parseInt(s) > 0,
          "Page must be a positive integer"
        )
        .transform((s) => parseInt(s)),
      include_disabled: z.string().optional(),
    });
    const parsedQuery = queryValidator.parse(req.query);

    const results = await prisma.channel.findMany({
      select: {
        channelId: true,
        username: true,
        enabled: true,
        registeredAt: true,
        _count: {
          select: {
            guilds: true,
          },
        },
      },
      where: {
        // If includeDisabled is true, don't filter by enabled.
        enabled: parsedQuery.include_disabled !== undefined ? undefined : true,
        // If search is set, search for channels by name (an empty string will search for all channels).
        username: {
          contains: parsedQuery.search,
        },
      },
      orderBy: {
        // Order by number of guilds that have added the channel.
        guilds: {
          _count: "desc",
        },
      },
      take: 10,
      // Skip as many results as needed to get to the page number.
      skip: 10 * (parsedQuery.page - 1),
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
  .all((req: Request, res: CustomResponse, next) => {
    if (!req.params.channelId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "Invalid channel ID.",
      });
      return;
    }
    next();
  })
  .get(async (req: Request, res: CustomResponse) => {
    // Get a channel by its ID

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
    // Toggle a channel
    // Query parameters:
    // - enabled: boolean - Whether the channel should be enabled or disabled (optional).

    const { channelId } = req.params;

    try {
      const bodyValidator = z.object({
        enabled: z.boolean().optional(),
      });

      const parsedBody = bodyValidator.parse(req.body);

      // Get the channel's current status.
      const existing = await prisma.channel.findUnique({
        select: {
          enabled: true,
        },
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
            // Either use the value from the request body, or invert the existing value.
            enabled: parsedBody.enabled ?? !existing.enabled,
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
          where: {
            channelId,
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
    // Delete a channel

    const { channelId } = req.params;

    try {
      await prisma.channel.delete({
        where: {
          channelId,
        },
      });

      res.json({
        success: true,
        message: "The Twitch channel was successfully deleted.",
      });
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
