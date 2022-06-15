import { PrismaClient, State } from "@prisma/client";
import { Router } from "express";
import crypto from "crypto";
import { z, ZodError } from "zod";
import axios from "axios";

export const router = Router();
const db = new PrismaClient();

router.get("/twitch", async (_req, res) => {
  const state = crypto.randomBytes(20).toString("hex");
  try {
    await db.state.create({
      data: { value: state },
      select: { value: true },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "There was an error processing your request.",
    });
    return;
  }

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
        let parameters = new URLSearchParams();
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

async function deleteState(state: State) {
  await db.state.delete({ where: { value: state.value } }).catch((err) => {
    throw err;
  });
}
