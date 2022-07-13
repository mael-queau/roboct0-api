import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { FormattedError } from "../types/error";

import { verifyChannel } from "./channels";

const prisma = new PrismaClient();

/**
 * A variable looks like this: {{name}}.
 *
 * It can only contain letters, numbers, and underscores.
 *
 * It cannot start with a number or underscore.
 *
 * I cannot be longer than 15 characters.
 */
export const variableRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]{0,15})\}\}/g;
export const variableNameRegex = /[a-zA-Z_][a-zA-Z0-9_]{0,15}/;

/**
 * Extracts a list of {{variables}} from a string.
 * @param str The string to extract from.
 * @returns The list of variable names.
 */
export function extractVariables(str: string) {
  const baseRegex = /\{\{[^}]*\}\}/g;

  if (/\{\{[^\}]*\{\{/.test(str)) {
    throw new FormattedError("Unmatched '{{'", 400);
  }

  if (/\}\}[^\{]*\}\}/.test(str)) {
    throw new FormattedError("Unmatched '}}'", 400);
  }

  const all = str.match(baseRegex) ?? [];
  const valid = str.match(variableRegex) ?? [];

  if (all.some((s) => !valid.includes(s))) {
    throw new FormattedError("Invalid variable name", 400);
  }

  return valid.map((s) => s.slice(2, -2));
}

type formatData = {
  content: string;
  variables: { name: string; value: number }[];
  [key: string]: any;
};

/**
 * Formats a command's content by replacing variables with their values.
 * @param data An object containing the command's content and variables.
 * @returns The formatted content.
 */
export function formatContent(data: formatData) {
  const { content, variables } = data;

  const formatted = content.replace(variableRegex, (_, name) => {
    const variable = variables.find((v) => v.name === name);

    if (!variable) {
      throw new FormattedError(`Variable '${name}' not found`, 500);
    }

    return variable.value.toString();
  });

  return formatted;
}

/**
 * Get all variables associated with a command.
 * @param channelId The channel ID.
 * @param keyword The command's keyword.
 * @param force Whether to bypass disabled items.
 * @returns The list of variables.
 */
export async function listVariables(
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
        enabled: true,
        variables: {
          select: {
            name: true,
            value: true,
          },
        },
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
      throw new FormattedError("This command is disabled.", 403);
    }

    if (result.variables.length === 0) {
      throw new FormattedError("This command has no variables.", 404);
    }

    return result.variables;
  } catch (e) {
    if (e instanceof FormattedError) throw e;

    console.error(e);
    throw new FormattedError();
  }
}

/**
 * Get a variable by its name.
 * @param channelId The channel ID.
 * @param keyword The command's keyword.
 * @param name The variable's name.
 * @param force Whether to bypass disabled items.
 * @returns The variable information.
 */
export async function getVariable(
  channelId: string,
  keyword: string,
  name: string,
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
        enabled: true,
        variables: {
          where: {
            name: name,
          },
        },
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
      throw new FormattedError("This command is disabled.", 403);
    }

    if (!result.variables.some((v) => v.name === name)) {
      throw new FormattedError(`Variable not found.`, 404);
    }

    return result.variables.find((v) => v.name === name);
  } catch (e) {
    if (e instanceof FormattedError) throw e;

    console.error(e);
    throw new FormattedError();
  }
}

/**
 * Set a variable's value.
 * @param channelId The channel ID.
 * @param keyword The command's keyword.
 * @param name The variable's name.
 * @param value The variable's value.
 * @param force Whether to bypass disabled items.
 * @returns The variable information.
 */
export async function setVariable(
  channelId: string,
  keyword: string,
  name: string,
  value: number,
  force: boolean = false
) {
  if (!force) {
    if ((await verifyChannel(channelId)) === false) {
      throw new FormattedError("This channel is disabled.", 403);
    }
  }

  try {
    const command = await prisma.command.findUnique({
      select: {
        id: true,
        enabled: true,
      },
      where: {
        channelId_keyword: {
          channelId: channelId,
          keyword: keyword,
        },
      },
    });

    if (command === null) {
      throw new FormattedError("Command not found.", 404);
    }

    if (!command.enabled && !force) {
      throw new FormattedError("This command is disabled.", 403);
    }

    const variable = await prisma.variable.update({
      data: {
        value: {
          set: value,
        },
      },
      select: {
        name: true,
        value: true,
      },
      where: {
        commandId_name: {
          commandId: command.id,
          name: name,
        },
      },
    });

    return variable;
  } catch (e) {
    if (e instanceof FormattedError) throw e;
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      throw new FormattedError("Variable not found.", 404);
    }

    console.error(e);
    throw new FormattedError();
  }
}

/**
 * Increment or decrement a variable's value.
 * @param channelId The channel ID.
 * @param keyword The command's keyword.
 * @param name The variable's name.
 * @param value The variable's value.
 * @param force Whether to bypass disabled items.
 * @returns The variable information.
 */
export async function incrementVariable(
  channelId: string,
  keyword: string,
  name: string,
  value: number = 1,
  force: boolean = false
) {
  if (!force) {
    if ((await verifyChannel(channelId)) === false) {
      throw new FormattedError("This channel is disabled.", 403);
    }
  }

  try {
    const command = await prisma.command.findUnique({
      select: {
        id: true,
        enabled: true,
      },
      where: {
        channelId_keyword: {
          channelId: channelId,
          keyword: keyword,
        },
      },
    });

    if (command === null) {
      throw new FormattedError("Command not found.", 404);
    }

    if (!command.enabled && !force) {
      throw new FormattedError("This command is disabled.", 403);
    }

    const variable = await prisma.variable.update({
      data: {
        value: {
          increment: value >= 0 ? value : undefined,
          decrement: value < 0 ? Math.abs(value) : undefined,
        },
      },
      select: {
        name: true,
        value: true,
      },
      where: {
        commandId_name: {
          commandId: command.id,
          name: name,
        },
      },
    });

    return variable;
  } catch (e) {
    if (e instanceof FormattedError) throw e;
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      throw new FormattedError("Variable not found.", 404);
    }

    console.error(e);
    throw new FormattedError();
  }
}
