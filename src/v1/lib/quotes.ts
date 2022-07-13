import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { FormattedError } from "../types/error";

import { verifyChannel } from "./channels";

const prisma = new PrismaClient();

/**
 * Search for quotes.
 * @param channelId The channel to search in.
 * @param query The search query.
 * @param page Pagination for the results.
 * @param force Whether to bypass disabled items.
 * @returns A list of quotes.
 */
export async function searchQuotes(
  channelId: string,
  query: string = "",
  page: number = 1,
  force: boolean = false
) {
  if (!force) {
    if ((await verifyChannel(channelId)) === false) {
      throw new FormattedError("This channel is disabled.", 403);
    }
  }

  if (page < 1) {
    throw new FormattedError("Page number must be a positive integer.", 400);
  }

  try {
    const results = await prisma.quote.findMany({
      select: {
        channelId: true,
        quoteId: true,
        content: true,
        date: true,
        enabled: true,
      },
      where: {
        channelId: channelId,
        content: {
          search: query,
        },
        enabled: force ? undefined : true,
      },
      orderBy: {
        date: "desc",
      },
      take: 10,
      skip: 10 * (page - 1),
    });

    return results;
  } catch (e) {
    console.error(e);
    throw new FormattedError();
  }
}

/**
 * Get a random quote from a channel.
 * @param channelId The channel to get a quote from.
 * @returns A random quote.
 */
export async function getRandomQuote(channelId: string) {
  if ((await verifyChannel(channelId)) === false) {
    throw new FormattedError("This channel is disabled.", 403);
  }

  try {
    const result = await prisma.quote.findMany({
      where: {
        channelId: channelId,
        enabled: true,
      },
    });

    if (result.length === 0) {
      throw new FormattedError("No quotes found.", 404);
    }

    return result[crypto.randomInt(0, result.length - 1)];
  } catch (e) {
    if (e instanceof FormattedError) throw e;

    console.error(e);
    throw new FormattedError();
  }
}

/**
 * Get a quote by its ID.
 * @param channelId The channel the quote belongs to.
 * @param quoteId The quote's ID.
 * @param force Whether to bypass disabled items.
 * @returns The quote.
 */
export async function getQuote(
  channelId: string,
  quoteId: number,
  force: boolean = false
) {
  if (!force) {
    if ((await verifyChannel(channelId)) === false) {
      throw new FormattedError("This channel is disabled.", 403);
    }
  }

  if (quoteId)
    try {
      const result = await prisma.quote.findUnique({
        select: {
          channelId: true,
          quoteId: true,
          content: true,
          date: true,
          enabled: true,
        },
        where: {
          channelId_quoteId: {
            channelId: channelId,
            quoteId: quoteId,
          },
        },
      });

      if (result === null) {
        throw new FormattedError("Quote not found.", 404);
      } else if (!result.enabled && !force) {
        throw new FormattedError("This quote is disabled.", 403);
      }

      return result;
    } catch (e) {
      if (e instanceof FormattedError) throw e;

      console.error(e);
      throw new FormattedError();
    }
}

/**
 * Create a quote for a specific channel.
 * @param channelId The channel to create the quote for.
 * @param content The quote's content.
 * @param force Whether to bypass disabled items.
 * @returns The quote.
 */
export async function createQuote(
  channelId: string,
  content: string,
  force: boolean = false
) {
  if (!force) {
    if ((await verifyChannel(channelId)) === false) {
      throw new FormattedError("This channel is disabled.", 403);
    }
  }

  if (content.length > 500) {
    throw new FormattedError(
      "Quote content must be less than 500 characters.",
      400
    );
  }

  try {
    const channel = await prisma.channel.update({
      data: {
        quoteIndex: {
          increment: 1,
        },
      },
      where: {
        channelId: channelId,
      },
    });

    const quote = await prisma.quote.create({
      data: {
        channelId: channelId,
        quoteId: channel.quoteIndex,
        content: content,
      },
      select: {
        channelId: true,
        quoteId: true,
        content: true,
        date: true,
        enabled: true,
      },
    });

    return quote;
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2002") {
      throw new FormattedError("Quote already exists.", 409);
    }

    console.error(e);
    throw new FormattedError();
  }
}

/**
 * Update a quote.
 * @param channelId The channel the quote belongs to.
 * @param quoteId The quote's ID.
 * @param content The quote's new content.
 * @param date The quote's new date.
 * @param force Whether to bypass disabled items.
 * @returns The quote.
 */
export async function updateQuote(
  channelId: string,
  quoteId: number,
  content?: string,
  date?: Date,
  force: boolean = false
) {
  if (!force) {
    if ((await verifyChannel(channelId)) === false) {
      throw new FormattedError("This channel is disabled.", 403);
    }
  }

  if (content && content.length > 500) {
    throw new FormattedError(
      "Quote content must be less than 500 characters.",
      400
    );
  }

  try {
    const quote = await prisma.quote.update({
      data: {
        content: content,
        date: date,
      },
      select: {
        channelId: true,
        quoteId: true,
        content: true,
        date: true,
        enabled: true,
      },
      where: {
        channelId_quoteId: {
          channelId: channelId,
          quoteId: quoteId,
        },
      },
    });

    if (!quote.enabled && !force) {
      throw new FormattedError("This quote is disabled.", 403);
    }

    return quote;
  } catch (e) {
    if (e instanceof FormattedError) throw e;
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      throw new FormattedError("Quote not found.", 404);
    }

    console.error(e);
    throw new FormattedError();
  }
}

/**
 * Toggle a quote's enabled state.
 * @param channelId The channel the quote belongs to.
 * @param quoteId The quote's ID.
 * @param enabled Whether to enable or disable the quote.
 * @param force Whether to bypass disabled items.
 * @returns The quote.
 */
export async function toggleQuote(
  channelId: string,
  quoteId: number,
  enabled?: boolean,
  force: boolean = false
) {
  if (!force) {
    if ((await verifyChannel(channelId)) === false) {
      throw new FormattedError("This channel is disabled.", 403);
    }
  }

  try {
    const existing = await prisma.quote.findUnique({
      select: {
        enabled: true,
      },
      where: {
        channelId_quoteId: {
          channelId: channelId,
          quoteId: quoteId,
        },
      },
    });

    if (existing === null) {
      throw new FormattedError("Quote not found.", 404);
    }

    const quote = await prisma.quote.update({
      data: {
        enabled: enabled === undefined ? !existing.enabled : enabled,
      },
      select: {
        channelId: true,
        quoteId: true,
        content: true,
        date: true,
        enabled: true,
      },
      where: {
        channelId_quoteId: {
          channelId: channelId,
          quoteId: quoteId,
        },
      },
    });

    return quote;
  } catch (e) {
    if (e instanceof FormattedError) throw e;
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      throw new FormattedError("Quote not found.", 404);
    }

    console.error(e);
    throw new FormattedError();
  }
}

/**
 * Delete a quote.
 * @param channelId The channel the quote belongs to.
 * @param quoteId The quote's ID.
 * @param force Whether to bypass disabled items.
 * @returns The quote.
 */
export async function deleteQuote(
  channelId: string,
  quoteId: number,
  force: boolean = false
) {
  if (!force) {
    if ((await verifyChannel(channelId)) === false) {
      throw new FormattedError("This channel is disabled.", 403);
    }
  }

  try {
    const quote = await prisma.quote.delete({
      where: {
        channelId_quoteId: {
          channelId: channelId,
          quoteId: quoteId,
        },
      },
    });

    return quote;
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      throw new FormattedError("Quote not found.", 404);
    }

    console.error(e);
    throw new FormattedError();
  }
}
