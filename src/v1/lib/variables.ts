import { FormattedError } from "../types/error";

/**
 * A variable looks like this: {{name}}.
 *
 * It can only contain letters, numbers, and underscores.
 *
 * It cannot start with a number or underscore.
 *
 * I cannot be longer than 15 characters.
 */
export const validRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]{0,15})\}\}/g;

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
  const valid = str.match(validRegex) ?? [];

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

  const formatted = content.replace(validRegex, (_, name) => {
    const variable = variables.find((v) => v.name === name);

    if (!variable) {
      throw new FormattedError(`Variable '${name}' not found`, 500);
    }

    return variable.value.toString();
  });

  return formatted;
}
