import { Request, Router } from "express";
import { CustomResponse } from "../helper";
import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { z, ZodError } from "zod";

const router = Router();
export default router;

const prisma = new PrismaClient();

router
  .route("/channels/:channelId/commands")
  .get(async (req: Request, res: CustomResponse) => {
    if (!req.params.channelId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "Invalid channel id",
      });
    }

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
    if (!req.params.channelId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "Invalid channel id",
      });
    }

    const { channelId } = req.params;

    const bodyValidator = z.object({
      keyword: z.string(),
      content: z.string(),
    });

    try {
      const parsedBody = bodyValidator.parse(req.body);

      const result = await prisma.command.create({
        data: {
          channelId: channelId,
          keyword: parsedBody.keyword,
          content: parsedBody.content,
        },
      });

      try {
        await createVariables(result.id, parsedBody.content);
      } catch (e) {
        try {
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
            console.error(e);
            res.status(500).json({
              success: false,
              message: "Internal server error.",
            });
          }
        } catch (e) {
          console.error(e);
          res.status(500).json({
            success: false,
            message:
              "There was an error creating the variables for this command.",
          });
        }
        return;
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
  .get(async (req: Request, res: CustomResponse) => {
    if (!req.params.channelId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "Invalid channel id",
      });
    }

    if (!req.params.keyword.match(/^[a-zA-Z0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "Invalid keyword",
      });
    }

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
        const variables = await getVariableValues(result.id);

        const formattedCommand = {
          ...result,
          content: insertVariablesInContent(result.content, variables),
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
    if (!req.params.channelId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "Invalid channel id",
      });
    }

    if (!req.params.keyword.match(/^[a-zA-Z0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "Invalid keyword",
      });
    }

    const { channelId, keyword } = req.params;

    const bodyValidator = z.object({
      content: z.string(),
    });

    try {
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
        const variables = extractVariables(parsedBody.content);

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
    if (!req.params.channelId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "Invalid channel id",
      });
    }

    if (!req.params.keyword.match(/^[a-zA-Z0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "Invalid keyword",
      });
    }

    const { channelId, keyword } = req.params;

    const bodyValidator = z.object({
      enabled: z.boolean().optional(),
    });

    try {
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
          where: {
            id: existing.id,
          },
          data: {
            enabled: parsedBody.enabled ?? !existing.enabled,
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
    if (!req.params.channelId.match(/^[0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "Invalid channel id",
      });
    }

    if (!req.params.keyword.match(/^[a-zA-Z0-9]+$/)) {
      res.status(400).json({
        success: false,
        message: "Invalid keyword",
      });
    }

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
        await prisma.variable.deleteMany({
          where: {
            commandId: existing.id,
          },
        });

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

async function createVariables(id: number, content: string) {
  const variables = extractVariables(content);

  if (variables.length > 10) {
    throw new Error("Too many variables");
  }

  for (const variable of variables) {
    if (variable.match(/^[0-9]/) || variable.length > 10) {
      throw new Error("Invalid variable name: " + variable);
    } else if (variable.length === 0) {
      throw new Error("Empty variable name");
    }
  }

  const insertData = variables.map((variable) => ({
    commandId: id,
    name: variable,
  }));

  await prisma.variable.createMany({
    data: insertData,
  });

  return variables;
}

function extractVariables(content: string): string[] {
  const regex = /§[a-zA-Z0-9]+/g;
  const matches = content.match(regex);
  if (matches === null) {
    return [];
  } else {
    return matches.map((match) => match.slice(1));
  }
}

async function updateVariables(id: number, variables: string[]) {
  const existingVariables = await prisma.variable.findMany({
    where: {
      commandId: id,
    },
  });

  const unusedVariables = existingVariables.filter(
    (variable) => !variables.includes(variable.name)
  );

  await prisma.variable.deleteMany({
    where: {
      id: {
        in: unusedVariables.map((variable) => variable.id),
      },
    },
  });

  const newVariables = variables.filter(
    (variable) => !existingVariables.map((v) => v.name).includes(variable)
  );

  const insertData = newVariables.map((variable) => ({
    commandId: id,
    name: variable,
  }));

  await prisma.variable.createMany({
    data: insertData,
  });

  return {
    deleted: unusedVariables.map((variable) => variable.name),
    created: newVariables,
  };
}

async function getVariableValues(commandId: number) {
  const variableObjects = await prisma.variable.findMany({
    select: {
      name: true,
      value: true,
    },
    where: {
      commandId: commandId,
    },
  });
  const variableValues: { [key: string]: number } = {};
  for (const variable of variableObjects) {
    variableValues[variable.name] = variable.value;
  }
  return variableValues;
}

function insertVariablesInContent(
  content: string,
  variables: { [key: string]: number }
) {
  const regex = /§[a-zA-Z0-9]+/g;
  const matches = content.match(regex);
  if (matches === null) {
    return content;
  } else {
    for (const match of matches) {
      const variableName = match.slice(1);
      const variableValue = variables[variableName];
      if (variableValue !== undefined) {
        content = content.replace(match, variableValue.toString());
      }
    }
    return content;
  }
}
