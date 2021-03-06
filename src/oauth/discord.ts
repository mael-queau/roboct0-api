import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z, ZodError } from "zod";
import { createState, deleteState } from "./helper";

export const router = Router();
const prisma = new PrismaClient();

router.get("/discord", async (_req, res) => {
  // Create a state token to prevent CSRF.
  const state = await createState();

  // Discord bot permissions
  const permissions = "309237902400";
  const scopes = ["bot", "applications.commands"];

  let redirectUrl = `https://discord.com/api/oauth2/authorize`;
  redirectUrl += `?client_id=${process.env.DISCORD_ID}`;
  redirectUrl += `&permissions=${permissions}`;
  redirectUrl += `&redirect_uri=${process.env.API_URL}/discord/callback`;
  redirectUrl += `&response_type=code`;
  redirectUrl += `&scope=${encodeURI(scopes.join(" "))}`;
  redirectUrl += `&state=${state}`;

  res.redirect(redirectUrl);
});

router.get("/discord/callback", async (req, res) => {
  try {
    const queryValidator = z.object({
      code: z.string(),
      guild_id: z.string(),
      state: z.string(),
    });
    const parsedQuery = queryValidator.parse(req.query);

    // Check that the state token matches so that we can prevent CSRF.
    const state = await prisma.state.findUnique({
      where: {
        value: parsedQuery.state,
      },
    });

    if (state === null) {
      // State token is invalid.
      res.status(401).json({
        success: false,
        message: "The 'state' query parameter is invalid.",
      });
    } else {
      // Exchange the grant code for an access token.
      const { access_token, refresh_token } = await getAccessToken(
        parsedQuery.code
      );

      // Create a new guild in the database.
      // If the guild is already registered, update its access token and activate it.
      await prisma.guild.upsert({
        create: {
          guildId: parsedQuery.guild_id,
          token: access_token,
          refreshToken: refresh_token,
        },
        update: {
          enabled: true,
          token: access_token,
          refreshToken: refresh_token,
        },
        where: {
          guildId: parsedQuery.guild_id,
        },
      });

      // Delete the state token.
      await deleteState(state.value);

      console.log(
        `???? The guild ${parsedQuery.guild_id} has been registered.`.blue
      );

      res.status(201).json({
        success: true,
        message: "The guild was successfully registered.",
      });
    }
  } catch (e) {
    if (e instanceof ZodError) {
      if (req.query.error) {
        // There was an error from Discord instead of a code.
        res.status(401).json({
          success: false,
          message: req.query.error_description,
        });
      } else {
        // There was some other error with the query parameters.
        res.status(400).json({
          success: false,
          message: "The query parameters are invalid.",
        });
      }
    } else {
      // There was some unknown error.
      // Log it and send a generic error message.
      console.error(e);
      res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  }
});

/**
 * Retrieves an access refresh tokens from the Discord API.
 * @param code The grant code to exchange for an access token.
 * @returns The access and refresh tokens.
 */
async function getAccessToken(code: string) {
  const params = new URLSearchParams();
  params.append("client_id", process.env.DISCORD_ID!);
  params.append("client_secret", process.env.DISCORD_SECRET!);
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", `${process.env.API_URL}/discord/callback`);

  const response = await fetch(`https://discord.com/api/v10/oauth2/token`, {
    method: "POST",
    body: params,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  } else {
    const validator = z.object({
      access_token: z.string(),
      refresh_token: z.string(),
    });

    return validator.parse(await response.json());
  }
}
