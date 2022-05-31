import { Router } from "express";
import crypto from "crypto";
import db from "../db";
import axios from "axios";
import dayjs from "dayjs";
import { twitchClient } from "../axios";

const router = Router();

export default router;

router.get("/twitch", async (_req, res) => {
  let url = `https://id.twitch.tv/oauth2/authorize`;
  url += `?client_id=${process.env.TWITCH_ID}`;
  url += `&redirect_uri=${encodeURI(`${process.env.API_URL}/twitch/callback`)}`;
  url += `&response_type=code`;
  let scopes = [
    "analytics:read:games",
    "bits:read",
    "channel:manage:broadcast",
    "channel:manage:polls",
    "channel:manage:predictions",
    "channel:manage:redemptions",
    "channel:read:goals",
    "channel:read:predictions",
    "channel:read:redemptions",
    "channel:read:subscriptions",
    "clips:edit",
    "moderation:read",
  ];
  url += `&scope=${encodeURI(scopes.join(" "))}`;
  let state = crypto.randomBytes(16).toString("hex");
  let insertState = await db.state.create({
    data: {
      value: state,
    },
    select: {
      value: true,
    },
  });
  url += `&state=${insertState.value}`;
  res.redirect(url);
});

router.route("/twitch/callback").get(async (req, res) => {
  const state = await db.state.findUnique({
    where: {
      value: `${req.query.state}`,
    },
    select: {
      value: true,
      createdAt: true,
    },
  });
  if (state && dayjs().diff(state.createdAt, "minutes") > 10) {
    db.state.delete({
      where: {
        value: state.value,
      },
    });
    res.status(400).send("This session has expired, please try again");
    return;
  } else console.log("State hasn't expired");
  if (req.query.error) {
    if (req.query.error === "access_denied")
      res.status(400).send("Operation aborted by the user");
    else res.sendStatus(500);
  } else if (req.query.code) {
    const code = req.query.code;
    let url = `https://id.twitch.tv/oauth2/token`;
    let params = new URLSearchParams();
    params.append("client_id", `${process.env.TWITCH_ID}`);
    params.append("client_secret", `${process.env.TWITCH_SECRET}`);
    params.append("code", `${code}`);
    params.append("grant_type", "authorization_code");
    params.append(
      "redirect_uri",
      encodeURI(`${process.env.API_URL}/twitch/callback`)
    );
    axios
      .post(url, params)
      .then(async ({ data: tokenData }) => {
        const channelData = await getChannelFromToken(tokenData.access_token);
        console.log(channelData);
        db.channel
          .create({
            data: {
              channelId: channelData.id,
              channelName: channelData.display_name,
              token: {
                connectOrCreate: {
                  create: {
                    token: tokenData.access_token,
                    refreshToken: tokenData.refresh_token,
                    expiresIn: new Date(tokenData.expires_in),
                    type: "authorization_code",
                  },
                  where: {
                    token: tokenData.access_token,
                  },
                },
              },
            },
            include: { token: true },
          })
          .then((result) => {
            console.log(result);
            res
              .status(201)
              .send(
                `This channel was registered successfully. https://twitch.tv/${channelData.login} was registered.`
              );
          })
          .catch((err) => {
            console.error(err);
            res.sendStatus(500);
          });
      })
      .catch((err) => {
        console.error(err);
        res.sendStatus(500);
      });
  }
});

async function getChannelFromToken(token: string) {
  const res = await twitchClient.get(`/users`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data.data[0];
}
