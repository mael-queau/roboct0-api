import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { FormattedError } from "../types/error";
import { verifyChannel } from "./channels";
import { extractVariables, formatContent } from "./variables";

const prisma = new PrismaClient();

export const keywordRegex = /^[a-zA-Z][a-zA-Z0-9_]{1,14}$/;

/**
 * List commands for a channel.
 * @param channelId The channel from which to get commands.
 * @param page Pagination for the results.
 * @param force Whether to bypass disabled items.
 * @returns A list of quotes.
 */
export async function listCommands(
  channelId: string,
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
    const results = await prisma.command.findMany({
      select: {
        channelId: true,
        keyword: true,
        content: true,
        enabled: true,
        variables: true,
      },
      where: {
        channelId: channelId,
        enabled: force ? undefined : true,
      },
      orderBy: {
        keyword: "asc",
      },
      take: 10,
      skip: 10 * (page - 1),
    });

    if (results.length === 0) {
      throw new FormattedError("No commands found.", 404);
    }

    return results.map((result) => ({
      channelId: result.channelId,
      keyword: result.keyword,
      content: formatContent(result),
      enabled: result.enabled,
    }));
  } catch (e) {
    if (e instanceof FormattedError) throw e;

    console.error(e);
    throw new FormattedError();
  }
}

/**
 * Get a command by its keyword.
 * @param channelId The channel from which to get the command.
 * @param keyword The keyword of the command.
 * @param force Whether to bypass disabled items.
 * @returns The command.
 */
export async function getCommand(
  channelId: string,
  keyword: string,
  force: boolean = false
) {
  if (!force) {
    if ((await verifyChannel(channelId)) === false) {
      throw new FormattedError("This channel is disabled.", 403);
    }
  }

  try {
    const result = await prisma.command.findUnique({
      select: {
        channelId: true,
        keyword: true,
        content: true,
        enabled: true,
        variables: true,
      },
      where: {
        channelId_keyword: {
          channelId: channelId,
          keyword: keyword,
        },
      },
    });

    if (result === null) {
      throw new FormattedError("Command not found.", 404);
    }

    if (!result.enabled && !force) {
      throw new FormattedError("Command is disabled.", 403);
    }

    return {
      channelId: result.channelId,
      keyword: result.keyword,
      content: formatContent(result),
      enabled: result.enabled,
    };
  } catch (e) {
    if (e instanceof FormattedError) throw e;

    console.error(e);
    throw new FormattedError();
  }
}

/**
 * Create a command.
 * @param channelId The channel to create the command in.
 * @param keyword The command keyword.
 * @param content The command content.
 * @param force Whether to bypass disabled items.
 * @returns The command information.
 */
export async function createCommand(
  channelId: string,
  keyword: string,
  content: string,
  force: boolean = false
) {
  if (!force) {
    if ((await verifyChannel(channelId)) === false) {
      throw new FormattedError("This channel is disabled.", 403);
    }
  }

  try {
    const variables = extractVariables(content).map((variable) => ({
      name: variable,
    }));

    const result = await prisma.command.create({
      data: {
        channelId: channelId,
        keyword: keyword,
        content: content,
        variables: {
          createMany: {
            data: variables,
          },
        },
      },
      select: {
        channelId: true,
        keyword: true,
        content: true,
        enabled: true,
        variables: true,
      },
    });

    return {
      channelId: result.channelId,
      keyword: result.keyword,
      content: formatContent(result),
      enabled: result.enabled,
    };
  } catch (e) {
    if (e instanceof FormattedError) throw e;
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2002") {
      throw new FormattedError("Command already exists.", 409);
    }

    console.error(e);
    throw new FormattedError();
  }
}

/**
 * Update a command.
 * @param channelId The channel to update the command in.
 * @param keyword The command keyword.
 * @param content The new command content.
 * @param force Whether to bypass disabled items.
 * @returns The new command information.
 */
export async function updateCommand(
  channelId: string,
  keyword: string,
  content: string,
  force: boolean = false
) {
  if (!force) {
    if ((await verifyChannel(channelId)) === false) {
      throw new FormattedError("This channel is disabled.", 403);
    }
  }

  try {
    const existing = await prisma.command.findUnique({
      select: {
        channelId: true,
        keyword: true,
        content: true,
        enabled: true,
        variables: true,
      },
      where: {
        channelId_keyword: {
          channelId: channelId,
          keyword: keyword,
        },
      },
    });

    if (existing === null) {
      throw new FormattedError("Command not found.", 404);
    }

    if (!existing.enabled && !force) {
      throw new FormattedError("Command is disabled.", 403);
    }

    const variables = extractVariables(content).map((variable) => ({
      name: variable,
    }));

    const unusedVariables = existing.variables.filter((variable) => {
      return !variables.some((v) => v.name === variable.name);
    });

    const result = await prisma.command.update({
      data: {
        content: content,
        variables: {
          createMany: {
            data: variables,
            skipDuplicates: true,
          },
          deleteMany: {
            name: {
              in: unusedVariables.map((variable) => variable.name),
            },
          },
        },
      },
      select: {
        channelId: true,
        keyword: true,
        content: true,
        enabled: true,
        variables: true,
      },
      where: {
        channelId_keyword: {
          channelId: channelId,
          keyword: keyword,
        },
      },
    });

    return {
      channelId: result.channelId,
      keyword: result.keyword,
      content: formatContent(result),
      enabled: result.enabled,
    };
  } catch (e) {
    if (e instanceof FormattedError) throw e;
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2002") {
      throw new FormattedError("Command already exists.", 409);
    }

    console.error(e);
    throw new FormattedError();
  }
}

/**
 * Toggle a command's enabled state.
 * @param channelId The channel to toggle the command in.
 * @param keyword The command keyword.
 * @param enabled Whether to enable or disable the command.
 * @param force Whether to bypass disabled items.
 */
export async function toggleCommand(
  channelId: string,
  keyword: string,
  enabled?: boolean,
  force: boolean = false
) {
  if (!force) {
    if ((await verifyChannel(channelId)) === false) {
      throw new FormattedError("This channel is disabled.", 403);
    }
  }

  try {
    const existing = await prisma.command.findUnique({
      select: {
        channelId: true,
        keyword: true,
        enabled: true,
      },
      where: {
        channelId_keyword: {
          channelId: channelId,
          keyword: keyword,
        },
      },
    });

    if (existing === null) {
      throw new FormattedError("Command not found.", 404);
    }

    const result = await prisma.command.update({
      data: {
        enabled: enabled ?? !existing.enabled,
      },
      select: {
        channelId: true,
        keyword: true,
        content: true,
        enabled: true,
        variables: true,
      },
      where: {
        channelId_keyword: {
          channelId: channelId,
          keyword: keyword,
        },
      },
    });

    return {
      channelId: result.channelId,
      keyword: result.keyword,
      content: formatContent(result),
      enabled: result.enabled,
    };
  } catch (e) {
    if (e instanceof FormattedError) throw e;
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      throw new FormattedError("This command doesn't exist.", 404);
    }

    console.error(e);
    throw new FormattedError();
  }
}

/**
 * Delete a command.
 * @param channelId The channel to delete the command from.
 * @param keyword The command keyword.
 * @param force Whether to bypass disabled items.
 * @returns The deleted command information.
 */
export async function deleteCommand(
  channelId: string,
  keyword: string,
  force: boolean = false
) {
  if (!force) {
    if ((await verifyChannel(channelId)) === false) {
      throw new FormattedError("This channel is disabled.", 403);
    }
  }

  try {
    const result = await prisma.command.delete({
      select: {
        channelId: true,
        keyword: true,
        content: true,
        enabled: true,
        variables: true,
      },
      where: {
        channelId_keyword: {
          channelId: channelId,
          keyword: keyword,
        },
      },
    });

    return {
      channelId: result.channelId,
      keyword: result.keyword,
      content: formatContent(result),
      enabled: result.enabled,
    };
  } catch (e) {
    if (e instanceof FormattedError) throw e;
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      throw new FormattedError("This command doesn't exist.", 404);
    }

    console.error(e);
    throw new FormattedError();
  }
}
