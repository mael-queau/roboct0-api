import { Router, Request } from "express";
import { z, ZodError } from "zod";
import { PrismaClient, Quote } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { CustomResponse } from "../helper";

const router = Router();
export default router;

const prisma = new PrismaClient();

router.get(
  "/channels/:channelId/randomQuote",
  async (req: Request, res: CustomResponse) => {
    // Get a random quote from a channel.

    if (!req.params.channelId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "Invalid channel ID.",
      });
      return;
    }

    const { channelId } = req.params;

    try {
      // Check if the channel exists.
      const channel = await prisma.channel.findUnique({
        where: {
          channelId,
        },
      });

      if (channel === null) {
        res.status(404).json({
          success: false,
          message: "This Twitch channel isn't registered with us.",
        });
        return;
      }

      // Since Prisma doesn't allow to randomly select a row, we have to do it manually.
      const result = await prisma.$queryRaw<
        Quote[]
      >`SELECT "quoteId", "content", "date" FROM "Quote" WHERE "channelId" = ${channelId} AND "enabled" = true ORDER BY RANDOM() LIMIT 1`;

      if (result.length === 0) {
        res.status(404).json({
          success: true,
          message: "This channel doesn't have any quotes yet.",
        });
      } else {
        // Otherwise, return the quote.
        res.status(200).json({
          success: true,
          data: result[0], // The result is an array, so we need to get the first element.
        });
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  }
);

router
  .route("/channels/:channelId/quotes")
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
    // List quotes from a channel.
    // Query parameters:
    // - search: string - Search for quotes containing this string.
    // - page: number - The page number.
    // - include_disabled: boolean - Whether to include disabled quotes.

    const { channelId } = req.params;

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
          .transform((s) => parseInt(s) - 1),
        include_disabled: z.boolean().default(false),
      });

      const parsedQuery = queryValidator.parse(req.query);

      const result = await prisma.quote.findMany({
        select: {
          quoteId: true,
          channelId: true,
          content: true,
          date: true,
          enabled: true,
        },
        where: {
          enabled: true,
          channelId: channelId,
          content: {
            // Make use of PostgreSQL's fulltext search.
            contains: parsedQuery.search,
            mode: "insensitive",
          },
        },
        orderBy: {
          // Order by most recent.
          date: "desc",
        },
        take: 10,
        skip: 10 * parsedQuery.page,
      });

      if (result.length === 0) {
        res.status(404).json({
          success: true,
          message: "This channel doesn't have any quotes yet.",
        });
      } else {
        res.status(200).json({
          success: true,
          data: result,
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
          message: "An unknown error occured.",
        });
      }
    }
  })
  .post(async (req: Request, res: CustomResponse) => {
    // Create a quote.
    // Body parameters:
    // - content: string - The quote content.

    const { channelId } = req.params;

    try {
      const queryValidator = z.object({
        content: z.string(),
      });

      const parsedQuery = queryValidator.parse(req.body);

      // Get the channel's new quote index
      const channel = await prisma.channel.update({
        data: {
          quoteIndex: {
            increment: 1,
          },
        },
        select: {
          quoteIndex: true,
        },
        where: {
          channelId: channelId,
        },
      });

      // Create the quote
      const result = await prisma.quote.create({
        data: {
          quoteId: channel.quoteIndex + 1,
          channelId: channelId,
          content: parsedQuery.content,
        },
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "The query parameters are invalid.",
          data: e.format(),
        });
      } else if (
        e instanceof PrismaClientKnownRequestError &&
        e.code === "P2025"
      ) {
        res.status(404).json({
          success: false,
          message: "This Twitch channel isn't registered with us.",
        });
      } else {
        console.error(e);
        res.status(500).json({
          success: false,
          message: "An unknown error occured.",
        });
      }
    }
  });

router
  .route("/channels/:channelId/quotes/:quoteId")
  .all((req: Request, res: CustomResponse, next) => {
    if (!req.params.channelId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "Invalid channel ID.",
      });
      return;
    }
    if (!req.params.quoteId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "Invalid quote ID.",
      });
      return;
    }
    next();
  })
  .get(async (req: Request, res: CustomResponse) => {
    // Get a quote.

    const { channelId, quoteId } = req.params;

    try {
      const result = await prisma.quote.findUnique({
        select: {
          quoteId: true,
          channelId: true,
          content: true,
          date: true,
          enabled: true,
        },
        where: {
          channelId_quoteId: {
            channelId: channelId,
            quoteId: parseInt(quoteId),
          },
        },
      });

      if (result === null) {
        res.status(404).json({
          success: true,
          message: "This quote doesn't exist.",
        });
      } else {
        res.status(200).json({
          success: true,
          data: result,
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
  .put(async (req: Request, res: CustomResponse) => {
    // Update a quote.
    // Body parameters:
    // - content: string - The new content (optional).
    // - date: string - The new date (optional).

    const { channelId, quoteId } = req.params;

    try {
      const bodyValidator = z.object({
        content: z.string().optional(),
        date: z.string().optional(),
      });

      const parsedBody = bodyValidator.parse(req.body);

      // If a date was provided, make sure it is in the ISO8601 format.
      if (parsedBody.date) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
        if (!parsedBody.date.match(dateRegex)) {
          res.status(400).json({
            success: false,
            message: "The date must be in the ISO8601 format.",
          });
          return;
        }
      }

      // Retrieve the existing quote.
      const existing = await prisma.quote.findUnique({
        select: {
          quoteId: true,
          channelId: true,
          content: true,
          date: true,
          enabled: true,
        },
        where: {
          channelId_quoteId: {
            channelId: channelId,
            quoteId: parseInt(quoteId),
          },
        },
      });

      if (existing === null) {
        res.status(404).json({
          success: true,
          message: "This quote doesn't exist.",
        });
        return;
      }

      // Update the quote.
      const result = await prisma.quote.update({
        data: {
          // Update the content and / or date depending on what was provided.
          content: parsedBody.content ?? existing.content,
          date: parsedBody.date ?? existing.date,
        },
        select: {
          quoteId: true,
          channelId: true,
          content: true,
          date: true,
          enabled: true,
        },
        where: {
          channelId_quoteId: {
            channelId: channelId,
            quoteId: parseInt(quoteId),
          },
        },
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "The query parameters are invalid.",
        });
      } else if (
        e instanceof PrismaClientKnownRequestError &&
        e.code === "P2025"
      ) {
        res.status(404).json({
          success: false,
          message: "This quote doesn't exist.",
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
  .patch(async (req: Request, res: CustomResponse) => {
    // Toggle a quote.
    // Body parameters:
    // - enabled: boolean - The new enabled value (optional).

    const { channelId, quoteId } = req.params;

    try {
      const bodyValidator = z.object({
        enabled: z.boolean().optional(),
      });

      const parsedBody = bodyValidator.parse(req.body);

      const existing = await prisma.quote.findUnique({
        select: {
          enabled: true,
        },
        where: {
          channelId_quoteId: {
            channelId: channelId,
            quoteId: parseInt(quoteId),
          },
        },
      });

      if (existing === null) {
        res.status(404).json({
          success: false,
          message: "This quote doesn't exist.",
        });
      } else {
        const result = await prisma.quote.update({
          data: {
            // Update the enabled value if it was provided.
            // If it wasn't, toggle the value.
            enabled: parsedBody.enabled ?? !existing.enabled,
          },
          select: {
            quoteId: true,
            channelId: true,
            content: true,
            date: true,
            enabled: true,
          },
          where: {
            channelId_quoteId: {
              channelId: channelId,
              quoteId: parseInt(quoteId),
            },
          },
        });
        res.json({
          success: true,
          data: result,
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
    // Delete a quote.

    const { channelId, quoteId } = req.params;

    try {
      await prisma.quote.delete({
        where: {
          channelId_quoteId: {
            channelId: channelId,
            quoteId: parseInt(quoteId),
          },
        },
      });

      res.json({
        success: true,
        message: "The quote was successfully deleted.",
      });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
        res.status(404).json({
          success: false,
          message: "This quote doesn't exist.",
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
