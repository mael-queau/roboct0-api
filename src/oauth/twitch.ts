import { PrismaClient, Channel } from "@prisma/client";
import { Router } from "express";
import { z, ZodError } from "zod";
import { createState, deleteState, getUserInfo } from "./helper";

export const router = Router();
const db = new PrismaClient();

router.get("/twitch", async (_req, res) => {
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
  const queryValidator = z.object({
    code: z.string(),
    scope: z.string(),
    state: z.string(),
  });

  try {
    const parsedQuery = queryValidator.parse(req.query);

    const state = await db.state.findUnique({
      where: {
        value: parsedQuery.state,
      },
    });

    if (state === null) {
      res.status(401).json({
        success: false,
        message: "The 'state' query parameter is invalid.",
      });
    } else {
      const { access_token, refresh_token } = await getAccessToken(
        parsedQuery.code
      );
      const userInfo = await getUserInfo(access_token);
      await db.channel.upsert({
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

      await deleteState(state);

      console.log(
        `🎉 ${userInfo.login} just linked their Twitch account.`.blue
      );

      res.status(201).json({
        success: true,
        message: "The channel was successfully registered.",
      });
    }
  } catch (e) {
    console.error(e);
    if (e instanceof ZodError) {
      if (req.query.error) {
        res.status(401).json({
          success: false,
          message: req.query.error_description,
        });
      } else {
        res.status(400).json({
          success: false,
          message: "The query parameters are invalid.",
        });
      }
    } else {
      res.status(500).json({
        success: false,
        message: "An unknown error occurred.",
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

    const result = await db.channel.update({
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
    console.log(`❌ Failed to refresh token for ${channel.username}`.red);
    // if node is in dev mode
    if (process.env.NODE_ENV !== "development") {
      const newChannel = await db.channel.update({
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
  const channels = await db.channel.findMany({
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
