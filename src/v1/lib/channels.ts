import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { FormattedError } from "../types/error";

const prisma = new PrismaClient();

/**
 * Search for channels by name.
 * @param query The search query.
 * @param page Pagination for the results.
 * @param force Whether to bypass disabled items.
 * @returns A list of channels.
 */
export async function searchChannels(
  query: string,
  page: number = 1,
  force: boolean = false
) {
  if (page < 1) {
    throw new FormattedError("Page number must be a positive integer.", 400);
  }

  try {
    const results = await prisma.channel.findMany({
      select: {
        channelId: true,
        username: true,
        registeredAt: true,
        enabled: true,
        _count: true,
      },
      where: {
        enabled: force ? undefined : true,
        username: {
          contains: query,
        },
      },
      orderBy: {
        guilds: {
          _count: "desc",
        },
      },
      take: 10,
      skip: 10 * (page - 1),
    });

    return results.map((result) => ({
      channelId: result.channelId,
      username: result.username,
      registeredAt: result.registeredAt,
      enabled: result.enabled,
      ...result._count,
    }));
  } catch (e) {
    console.error(e);
    throw new FormattedError();
  }
}

/**
 * Get a channel by its ID.
 * @param id The channel ID.
 * @param force Whether to bypass disabled items.
 * @returns The channel information.
 */
export async function getChannel(id: string, force: boolean = false) {
  try {
    const result = await prisma.channel.findUnique({
      select: {
        channelId: true,
        username: true,
        registeredAt: true,
        enabled: true,
        _count: true,
      },
      where: {
        channelId: id,
      },
    });

    if (result === null) {
      throw new FormattedError(
        "This Twitch channel isn't registered with us.",
        404
      );
    } else if (!result.enabled && !force) {
      throw new FormattedError("This Twitch channel is disabled.", 403);
    }

    return {
      channelId: result.channelId,
      username: result.username,
      registeredAt: result.registeredAt,
      enabled: result.enabled,
      ...result._count,
    };
  } catch (e) {
    if (e instanceof FormattedError) throw e;

    console.error(e);
    throw new FormattedError();
  }
}

/**
 * Toggle a channel's enabled state.
 * @param id The channel ID.
 * @param enabled Whether to enable or disable the channel.
 * @returns The updated channel information.
 */
export async function toggleChannel(id: string, enabled?: boolean) {
  if (enabled === undefined) {
    try {
      const existing = await prisma.channel.findUnique({
        select: {
          enabled: true,
        },
        where: {
          channelId: id,
        },
      });

      if (existing === null) {
        throw new FormattedError(
          "This Twitch channel isn't registered with us.",
          404
        );
      } else enabled = !existing.enabled;
    } catch (e) {
      if (e instanceof FormattedError) throw e;

      console.error(e);
      throw new FormattedError();
    }
  }

  try {
    const result = await prisma.channel.update({
      data: {
        enabled,
      },
      select: {
        channelId: true,
        username: true,
        registeredAt: true,
        enabled: true,
        _count: true,
      },
      where: {
        channelId: id,
      },
    });

    return {
      channelId: result.channelId,
      username: result.username,
      registeredAt: result.registeredAt,
      enabled: result.enabled,
      ...result._count,
    };
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      throw new FormattedError(
        "This Twitch channel isn't registered with us.",
        404
      );
    }
    console.error(e);
    throw new FormattedError();
  }
}

/**
 * Delete a channel.
 * @param id The channel ID.
 * @returns The deleted channel's information.
 */
export async function deleteChannel(id: string) {
  try {
    const result = await prisma.channel.delete({
      select: {
        channelId: true,
        username: true,
        registeredAt: true,
        enabled: true,
        _count: true,
      },
      where: {
        channelId: id,
      },
    });

    return {
      channelId: result.channelId,
      username: result.username,
      registeredAt: result.registeredAt,
      enabled: result.enabled,
      ...result._count,
    };
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      throw new FormattedError(
        "This Twitch channel isn't registered with us.",
        404
      );
    }
    console.error(e);
    throw new FormattedError();
  }
}

/**
 * Checks if a channel is enabled
 * @param id The channel ID.
 * @returns Whether the channel is enabled.
 */
export async function verifyChannel(id: string) {
  try {
    const result = await prisma.channel.findUnique({
      select: {
        enabled: true,
      },
      where: {
        channelId: id,
      },
    });

    if (result === null) {
      throw new FormattedError(
        "This Twitch channel isn't registered with us.",
        404
      );
    }

    return result.enabled;
  } catch (e) {
    if (e instanceof FormattedError) throw e;

    console.error(e);
    throw new FormattedError();
  }
}

/**
 * Gets the OAuth2 access token for a channel.
 * @param channelId The channel ID.
 * @returns The OAuth2 token.
 */
export async function getChannelToken(channelId: string) {
  try {
    const result = await prisma.channel.findUnique({
      select: {
        token: true,
      },
      where: {
        channelId: channelId,
      },
    });

    if (result === null) {
      throw new FormattedError(
        "This Twitch channel isn't registered with us.",
        404
      );
    }

    return result.token;
  } catch (e) {
    if (e instanceof FormattedError) throw e;

    console.error(e);
    throw new FormattedError();
  }
}
