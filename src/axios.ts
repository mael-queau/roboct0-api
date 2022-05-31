import axios from "axios";

export const twitchClient = axios.create({
  baseURL: `https://api.twitch.tv/helix`,
  headers: {
    "Client-Id": `${process.env.TWITCH_ID}`,
  },
});

export const discordClient = axios.create({
  baseURL: `https://discord.com/api/v10`,
  headers: {
    "Client-Id": `${process.env.DISCORD_ID}`,
  },
});
