import { PrismaClient, Twitch } from "@prisma/client";
import { Router } from "express";
import { z, ZodError } from "zod";
import axios, { AxiosError } from "axios";
import { createState, deleteState } from "./helper";

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
    code: z.string().optional(),
    scope: z.string().optional(),
    error: z.string().optional(),
    error_description: z.string().optional(),
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
      if (parsedQuery.error) {
        res.status(401).json({
          success: false,
          message: parsedQuery.error_description,
        });
      } else if (parsedQuery.code) {
        let targetUrl = `https://id.twitch.tv/oauth2/token`;
        const parameters = new URLSearchParams();
        parameters.append("client_id", process.env.TWITCH_ID as string);
        parameters.append("client_secret", process.env.TWITCH_SECRET as string);
        parameters.append("code", parsedQuery.code);
        parameters.append("grant_type", "authorization_code");
        parameters.append(
          "redirect_uri",
          `${process.env.API_URL}/twitch/callback`
        );
        axios
          .post(targetUrl, parameters)
          .then(async ({ data }) => {
            const dataValidator = z.object({
              access_token: z.string(),
              expires_in: z.number(),
              refresh_token: z.string(),
            });

            try {
              const { access_token, expires_in, refresh_token } =
                dataValidator.parse(data);

              await db.twitch.upsert({
                create: {
                  token: access_token,
                  expiresIn: expires_in,
                  refreshToken: refresh_token,
                },
                update: {
                  expiresIn: expires_in,
                  refreshToken: refresh_token,
                },
                where: {
                  token: access_token,
                },
              });

              await deleteState(state);

              res.status(201).json({
                success: true,
                message: "The channel was successfully registered.",
              });
            } catch (err) {
              if (err instanceof ZodError) {
                res.status(400).json({
                  success: false,
                  message:
                    "There was an issue with the data returned by Twitch.",
                });
              } else {
                res.status(500).json({
                  success: false,
                  message:
                    "There was an error obtaining an access token from Twitch.",
                });
              }
              return;
            }
          })
          .catch(() => {
            res.status(500).json({
              success: false,
              message:
                "There was an error obtaining an access token from Twitch.",
            });
          });
      }
    }
  } catch (err) {
    if (err instanceof ZodError) {
      res.sendStatus(400);
    } else {
      res.sendStatus(500);
    }
    return;
  }
});

/**
 * Refreshes a Twitch access token
 * @description In the context of the Twitch API's OAuth2 integration, we need to regularly refresh access tokens. This automates that process.
 * @param channel A Prisma Channel object (containing token information for a specific user)
 * @returns An updated version of that Prisma Channel object, with the updated token information
 */
export async function refreshToken(channel: Twitch): Promise<Twitch> {
  const parameters = new URLSearchParams();
  parameters.append("client_id", process.env.TWITCH_ID as string);
  parameters.append("client_secret", process.env.TWITCH_SECRET as string);
  parameters.append("grant_type", "refresh_token");
  parameters.append("refresh_token", channel.refreshToken);

  const { data } = await axios.post(
    `https://id.twitch.tv/oauth2/token`,
    parameters
  );

  const dataValidator = z.object({
    access_token: z.string(),
    refresh_token: z.string(),
  });

  const { access_token, refresh_token } = dataValidator.parse(data);

  const result = await db.twitch.update({
    data: {
      token: access_token,
      refreshToken: refresh_token,
    },
    where: {
      id: channel.id,
    },
  });
  console.log(`Token ${result.id} was refreshed successfully.`);
  return result;
}

export async function verifyTokens(): Promise<Twitch[]> {
  const channels = await db.twitch.findMany();

  const invalidTokens: Twitch[] = [];
  const targetUrl = `https://id.twitch.tv/oauth2/validate`;

  await Promise.all(
    channels.map(async (channel) => {
      let { token } = channel;
      try {
        await axios.get(targetUrl, {
          headers: {
            Authorization: `OAuth ${token}`,
          },
        });
        console.log(`Successfully validated token ${channel.id}`);
      } catch (err) {
        if (err instanceof AxiosError) {
          if (err.code === "ERR_BAD_REQUEST") {
            console.log(`Token ${channel.id} couldn't be validated.`);
            invalidTokens.push(channel);
          } else console.error(err);
        } else console.error(err);
      }
    })
  );

  return invalidTokens;
}
