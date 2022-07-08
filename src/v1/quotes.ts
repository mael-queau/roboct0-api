import { Router, Request } from "express";
import { CustomResponse } from "./helper";
import { PrismaClient, Quote } from "@prisma/client";
import { z, ZodError } from "zod";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";

const router = Router();
export default router;

const prisma = new PrismaClient();

router.get(
  "/channels/:channelId/randomQuote",
  async (req: Request, res: CustomResponse) => {
    if (!req.params.channelId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "The channel ID must be a number.",
      });
      return;
    }
    const { channelId } = req.params;

    try {
      const result = await prisma.$queryRaw<
        Quote[]
      >`SELECT "quoteId", "content", "date" FROM "Quote" WHERE "channelId" = ${channelId} AND "enabled" = true ORDER BY RANDOM() LIMIT 1`;

      if (result.length === 0) {
        res.status(404).json({
          success: true,
          message: "This channel doesn't have any quotes yet.",
        });
      } else {
        res.status(200).json({
          success: true,
          data: result[0],
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
  .get(async (req: Request, res: CustomResponse) => {
    if (!req.params.channelId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "The channel ID must be a number.",
      });
      return;
    }

    const { channelId } = req.params;

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
    });

    try {
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
            contains: parsedQuery.search,
            mode: "insensitive",
          },
        },
        orderBy: {
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
          data: e.format(),
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
    if (!req.params.channelId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "The channel ID must be a number.",
      });
      return;
    }

    const { channelId } = req.params;

    const queryValidator = z.object({
      content: z.string(),
    });

    try {
      const parsedQuery = queryValidator.parse(req.body);

      // Get the channel's quote index
      const channel = await prisma.channel.findUnique({
        select: {
          quoteIndex: true,
        },
        where: {
          channelId,
        },
      });

      if (channel === null) {
        res.status(404).json({
          success: false,
          message: "This channel doesn't exist.",
        });
        return;
      }

      const result = await prisma.quote.create({
        data: {
          quoteId: channel.quoteIndex + 1,
          channelId: channelId,
          content: parsedQuery.content,
        },
      });

      await prisma.channel.update({
        data: {
          quoteIndex: channel.quoteIndex + 1,
        },
        where: {
          channelId: channelId,
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
  .get(async (req: Request, res: CustomResponse) => {
    if (!req.params.channelId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "The channel ID must be a number.",
      });
      return;
    }

    if (!req.params.quoteId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "The quote ID must be a number.",
      });
      return;
    }

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
    if (!req.params.channelId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "The channel ID must be a number.",
      });
      return;
    }

    if (!req.params.quoteId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "The quote ID must be a number.",
      });
      return;
    }

    const { channelId, quoteId } = req.params;

    const bodyValidator = z.object({
      content: z.string(),
    });

    try {
      const parsedBody = bodyValidator.parse(req.body);

      const result = await prisma.quote.update({
        data: {
          content: parsedBody.content,
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
  .patch(async (req: Request, res: CustomResponse) => {
    if (!req.params.channelId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "The channel ID must be a number.",
      });
      return;
    }

    if (!req.params.quoteId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "The quote ID must be a number.",
      });
      return;
    }

    const { channelId, quoteId } = req.params;

    const bodyValidator = z.object({
      enabled: z.boolean().optional(),
    });

    try {
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
        return;
      } else {
        const result = await prisma.quote.update({
          data: {
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
        message: "The channel ID must be a number.",
      });
      return;
    }

    if (!req.params.quoteId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "The quote ID must be a number.",
      });
      return;
    }

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
