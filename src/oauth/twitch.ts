import { Router } from "express";
import { PrismaClient, Channel } from "@prisma/client";
import { z, ZodError } from "zod";
import { createState, deleteState } from "./helper";

export const router = Router();
const prisma = new PrismaClient();

router.get("/twitch", async (_req, res) => {
  // Create a state token to prevent CSRF.
  const state = await createState();
  const scopes = [
    "channel:manage:broadcast",
    "clips:edit",
    "chat:read",
    "chat:edit",
  ];

  let redirectUrl = `https://id.twitch.tv/oauth2/authorize`;
  redirectUrl += `?client_id=${process.env.TWITCH_ID}`;
  redirectUrl += `&redirect_uri=${process.env.API_URL}/twitch/callback`;
  redirectUrl += `&response_type=code`;
  redirectUrl += `&scope=${encodeURI(scopes.join(" "))}`;
  redirectUrl += `&state=${state}`;

  res.redirect(redirectUrl);
});

router.get("/twitch/callback", async (req, res) => {
  try {
    const queryValidator = z.object({
      code: z.string(),
      scope: z.string(),
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

      // Get additional information about the user.
      const userInfo = await getUserInfo(access_token);

      // Create a new channel in the database.
      // If the channel already exists, update its access token and enable it.
      await prisma.channel.upsert({
        create: {
          channelId: userInfo.id,
          username: userInfo.login,
          token: access_token,
          refreshToken: refresh_token,
        },
        update: {
          enabled: true,
          token: access_token,
          refreshToken: refresh_token,
        },
        where: {
          channelId: userInfo.id,
        },
      });

      // Delete the state token.
      await deleteState(state.value);

      console.log(
        `🎉 ${userInfo.login} just linked their Twitch account.`.blue
      );

      res.status(201).json({
        success: true,
        message: "The channel was successfully registered.",
      });
    }
  } catch (e) {
    if (e instanceof ZodError) {
      // There was an error from Twitch instead of a code.
      if (req.query.error) {
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
 * Retrieve the access and refresh tokens from the Twitch API.
 * @param code The grant code to exchange for an access token.
 * @returns The access token and refresh token.
 */
async function getAccessToken(code: string) {
  const params = new URLSearchParams();
  params.append("client_id", process.env.TWITCH_ID!);
  params.append("client_secret", process.env.TWITCH_SECRET!);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", process.env.API_URL + "/twitch/callback");
  params.append("code", code);

  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: params,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get access token.");
  } else {
    const validator = z.object({
      access_token: z.string(),
      refresh_token: z.string(),
    });
    return validator.parse(await response.json());
  }
}

/**
 * Refreshes a Twitch access token.
 * @description In the context of the Twitch API's OAuth2 integration, we need to regularly refresh access tokens. This automates that process.
 * @param channel A Prisma Channel object (containing token information for a specific user)
 * @returns An updated version of that Prisma Channel object, with the updated token information
 */
export async function refreshToken(channel: Channel): Promise<Channel> {
  const parameters = new URLSearchParams();
  parameters.append("client_id", process.env.TWITCH_ID!);
  parameters.append("client_secret", process.env.TWITCH_SECRET!);
  parameters.append("grant_type", "refresh_token");
  parameters.append("refresh_token", channel.refreshToken);

  try {
    const response = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      body: parameters,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    const data = await response.json();

    const dataValidator = z.object({
      access_token: z.string(),
      refresh_token: z.string(),
    });

    const { access_token, refresh_token } = dataValidator.parse(data);

    // Update the channel's access token and refresh token.
    const result = await prisma.channel.update({
      data: {
        lastRefresh: new Date(),
        token: access_token,
        refreshToken: refresh_token,
      },
      where: {
        id: channel.id,
      },
    });
    console.log(
      `✅ Successfully refreshed token for ${channel.username}`.green
    );
    return result;
  } catch (e) {
    console.log(
      `❌ Failed to refresh token for ${channel.username}. The channel has been disabled.`
        .red
    );
    // There was an error refreshing the token.
    // We need to disable the channel.
    // Don't actually disable the channel if node is in development mode.
    if (process.env.NODE_ENV !== "development") {
      // Disable the channel.
      const newChannel = await prisma.channel.update({
        where: {
          id: channel.id,
        },
        data: {
          enabled: false,
        },
      });
      return newChannel;
    } else return channel;
  }
}

/**
 * Verify all the active tokens from the database and returns a list of channels that need to be refreshed.
 * @returns A list of channels that need to be refreshed.
 */
export async function verifyTokens(): Promise<Channel[]> {
  // Get all the enabled channels' tokens from the database.
  const channels = await prisma.channel.findMany({
    where: { enabled: true },
  });

  console.log(`Verifying ${channels.length} enabled channels...`);

  const invalidTokens: Channel[] = [];

  for (const channel of channels) {
    try {
      let { token } = channel;
      const response = await fetch("https://id.twitch.tv/oauth2/validate", {
        headers: {
          Authorization: `OAuth ${token}`,
        },
        method: "GET",
      });
      if (!response.ok) {
        if (response.status === 401) {
          // The access token has expired.
          // Add the channel to the list of channels that need to be refreshed.
          invalidTokens.push(channel);
        } else {
          throw new Error(`There was an error verifying token ${channel.id}.`);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  console.log(`${invalidTokens.length} channels need to be refreshed.`);

  return invalidTokens;
}

/**
 * Retrieves user information from the Twitch api from the given access token.
 * @param token The access token to use.
 * @returns The user information.
 */
export async function getUserInfo(token: string) {
  const response = await fetch("https://api.twitch.tv/helix/users", {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Client-Id": process.env.TWITCH_ID!,
    },
  });
  if (!response.ok) {
    throw new Error("Failed to get user info.");
  }
  const { data } = await response.json();
  return {
    id: data[0].id,
    login: data[0].login,
  };
}
