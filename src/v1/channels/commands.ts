import { z, ZodError } from "zod";
import { Request, Router } from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { CustomResponse } from "../helper";

const router = Router();
export default router;

const prisma = new PrismaClient();

export const keywordRegex = /^[a-zA-Z][a-zA-Z0-9_]{0,9}$/;

router
  .route("/channels/:channelId/commands")
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
    // Get a list of commands for the channel.

    const { channelId } = req.params;

    try {
      const result = await prisma.command.findMany({
        select: {
          keyword: true,
          content: true,
        },
        where: {
          channelId: channelId,
          enabled: true,
        },
      });

      if (result.length === 0) {
        res.status(404).json({
          success: false,
          message: "No commands found for this channel",
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
        message: "Internal server error",
      });
    }
  })
  .post(async (req: Request, res: CustomResponse) => {
    // Create a new command.
    // Body parameters:
    // - content: string - The content of the command. May contain variables, starting with §.
    // - keyword: string - The keyword used to invoke the command.

    const { channelId } = req.params;

    try {
      const bodyValidator = z.object({
        keyword: z.string(),
        content: z.string(),
      });

      const parsedBody = bodyValidator.parse(req.body);

      // Create the command.
      const result = await prisma.command.create({
        data: {
          channelId: channelId,
          keyword: parsedBody.keyword,
          content: parsedBody.content,
        },
      });

      try {
        // Create the variables from the content.
        await createVariables(result.id, parsedBody.content);
      } catch (e) {
        // If the variables couldn't be created, delete the command.
        await prisma.command.delete({
          where: {
            id: result.id,
          },
        });
        if (e instanceof Error) {
          res.status(400).json({
            success: false,
            message: e.message,
          });
        } else {
          throw e;
        }
      }

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: e.message,
        });
      } else if (e instanceof PrismaClientKnownRequestError) {
        if (e.code === "P2002") {
          res.status(400).json({
            success: false,
            message: "Command already exists",
          });
        }
      } else {
        console.error(e);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  });

router
  .route("/channels/:channelId/commands/:keyword")
  .all((req: Request, res: CustomResponse, next) => {
    if (!req.params.channelId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "Invalid channel ID.",
      });
      return;
    }
    if (!req.params.keyword.match(keywordRegex)) {
      res.status(400).json({
        success: false,
        message: "Invalid keyword.",
      });
      return;
    }
    next();
  })
  .get(async (req: Request, res: CustomResponse) => {
    // Get a command by its keyword.

    const { channelId, keyword } = req.params;

    try {
      const result = await prisma.command.findUnique({
        select: {
          id: true,
          keyword: true,
          content: true,
          enabled: true,
        },
        where: {
          channelId_keyword: {
            channelId: channelId,
            keyword: keyword,
          },
        },
      });

      if (result === null) {
        res.status(404).json({
          success: false,
          message: "Command not found",
        });
      } else {
        // Replace the variables with their values in the content.
        const formattedCommand = {
          ...result,
          content: insertVariablesInContent(
            result.content,
            await getVariableValues(result.id)
          ),
        };

        res.status(200).json({
          success: true,
          data: formattedCommand,
        });
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  })
  .put(async (req: Request, res: CustomResponse) => {
    // Update a command.

    const { channelId, keyword } = req.params;

    try {
      const bodyValidator = z.object({
        content: z.string(),
      });

      const parsedBody = bodyValidator.parse(req.body);

      const result = await prisma.command.update({
        where: {
          channelId_keyword: {
            channelId: channelId,
            keyword: keyword,
          },
        },
        data: {
          content: parsedBody.content,
        },
      });

      if (result === null) {
        res.status(404).json({
          success: false,
          message: "Command not found",
        });
      } else {
        // Extract the variables from the content.
        const variables = extractVariables(parsedBody.content);

        // Make the necessary changes to the variables.
        await updateVariables(result.id, variables);

        res.status(200).json({
          success: true,
          data: result,
        });
      }
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: e.message,
        });
      } else {
        console.error(e);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  })
  .patch(async (req: Request, res: CustomResponse) => {
    // Toggle a command.

    const { channelId, keyword } = req.params;

    try {
      const bodyValidator = z.object({
        enabled: z.boolean().optional(),
      });

      const parsedBody = bodyValidator.parse(req.body);

      const existing = await prisma.command.findUnique({
        where: {
          channelId_keyword: {
            channelId: channelId,
            keyword: keyword,
          },
        },
      });

      if (existing === null) {
        res.status(404).json({
          success: false,
          message: "Command not found",
        });
      } else {
        const result = await prisma.command.update({
          data: {
            // If the enabled property is not specified, toggle it.
            // If it is specified, use it to set the new value.
            enabled: parsedBody.enabled ?? !existing.enabled,
          },
          where: {
            id: existing.id,
          },
        });

        if (result === null) {
          res.status(404).json({
            success: false,
            message: "Command not found",
          });
        } else {
          res.status(200).json({
            success: true,
            data: result,
          });
        }
      }
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: e.message,
        });
      } else {
        console.error(e);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  })
  .delete(async (req: Request, res: CustomResponse) => {
    // Delete a command.

    const { channelId, keyword } = req.params;

    try {
      const existing = await prisma.command.findUnique({
        where: {
          channelId_keyword: {
            channelId: channelId,
            keyword: keyword,
          },
        },
      });

      if (existing === null) {
        res.status(404).json({
          success: false,
          message: "Command not found",
        });
      } else {
        // Delete the variables associated with the command.
        await prisma.variable.deleteMany({
          where: {
            commandId: existing.id,
          },
        });

        // Delete the command.
        const result = await prisma.command.delete({
          where: {
            channelId_keyword: {
              channelId: channelId,
              keyword: keyword,
            },
          },
        });

        res.status(200).json({
          success: true,
          data: result,
        });
      }
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: e.message,
        });
      } else if (
        e instanceof PrismaClientKnownRequestError &&
        e.code === "P2025"
      ) {
        res.status(404).json({
          success: false,
          message: "Command not found",
        });
      } else {
        console.error(e);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  });

/**
 * Extract the variables from a command's content, and insert them into the database.
 * @param id The ID of the command.
 * @param content The content from which to extract the variables.
 * @returns The variables that were created.
 */
async function createVariables(id: number, content: string) {
  // Extract the variables from the content.
  const variables = extractVariables(content);

  if (variables.length > 10) {
    // If there are more than 10 variables, throw an error.
    throw new Error("Too many variables");
  }

  for (const variable of variables) {
    if (variable.match(/^[0-9]/) || variable.length > 10) {
      // If a variable starts with a number or is longer than 10 characters, throw an error.
      throw new Error("Invalid variable name: " + variable);
    } else if (variable.length === 0) {
      // If a variable is empty, throw an error.
      throw new Error("Empty variable name");
    }
  }

  // Create an array of variables to insert.
  const insertData = variables.map((variable) => ({
    commandId: id,
    name: variable,
  }));

  // Insert the variables.
  await prisma.variable.createMany({
    data: insertData,
  });

  return variables;
}

/**
 * Extract the variables from a command's content.
 * @description This function extracts the variables from a command's content. The variables are signified by a § sign.
 * @param content The content from which to extract the variables.
 * @returns An array of variables.
 */
function extractVariables(content: string): string[] {
  // Find every word that starts with a §.
  const variables = content.match(/§[a-zA-Z0-9]+/g);

  if (variables === null) {
    return [];
  }

  const validRegex = /^[a-zA-Z][a-zA-Z0-9_]{0,9}$/;

  // Check if the variables are valid.
  if (!variables.every((variable) => validRegex.test(variable))) {
    throw new Error("Invalid variable name");
  }

  // Return the variables without the §.
  return variables.map((variable) => variable.substring(1));
}

/**
 * Update the variables associated with a command.
 * @param id The ID of the command.
 * @param variables The new variables to associate with the command.
 * @returns The variables that were deleted and created.
 */
async function updateVariables(id: number, variables: string[]) {
  // Find the existing variables associated with the command.
  const existingVariables = await prisma.variable.findMany({
    where: {
      commandId: id,
    },
  });

  // Create an array of variables to delete.
  const unusedVariables = existingVariables.filter(
    (variable) => !variables.includes(variable.name)
  );

  // Delete the unused variables.
  await prisma.variable.deleteMany({
    where: {
      id: {
        in: unusedVariables.map((variable) => variable.id),
      },
    },
  });

  // Create an array of variables to insert.
  const newVariables = variables.filter(
    (variable) => !existingVariables.map((v) => v.name).includes(variable)
  );

  // Prepare the data to insert.
  const insertData = newVariables.map((variable) => ({
    commandId: id,
    name: variable,
  }));

  // Insert the new variables.
  await prisma.variable.createMany({
    data: insertData,
  });

  // Return the variables that were deleted and created.
  return {
    deleted: unusedVariables.map((variable) => variable.name),
    created: newVariables,
  };
}

/**
 * Get the value of the variables associated with a command.
 * @param commandId The ID of the command.
 */
async function getVariableValues(commandId: number) {
  // Find the variables associated with the command.
  const variableObjects = await prisma.variable.findMany({
    select: {
      name: true,
      value: true,
    },
    where: {
      commandId: commandId,
    },
  });

  // Create an object with the variables and their values, and return it.
  const variableValues: { [key: string]: number } = {};
  for (const variable of variableObjects) {
    variableValues[variable.name] = variable.value;
  }
  return variableValues;
}

/**
 * Replace the variables in a command's content with their values.
 * @param content The content in which to replace the variables.
 * @param values The values of the variables.
 * @returns The content with the variables replaced.
 */
function insertVariablesInContent(
  content: string,
  values: { [key: string]: number }
) {
  // Extract the variables from the content.
  const variables = extractVariables(content);

  if (variables === null) {
    return content;
  } else {
    for (const match of variables) {
      // Get the name of the variable.
      const variableName = match.slice(1);
      // Get its value.
      const variableValue = values[variableName];
      if (variableValue !== undefined) {
        // Replace the variable with its value.
        content = content.replace(match, variableValue.toString());
      }
    }
    // Return the content with the variables replaced.
    return content;
  }
}
