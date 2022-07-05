import crypto from "crypto";
import { PrismaClient, State } from "@prisma/client";
import { twitchApi } from "..";

const db = new PrismaClient();

/**
 * Creates a state and adds it to the database.
 * @description When using OAuth2 flows, it is strongly recommended to use unique strings (passed as 'state' query parameters) in order to verify that no cross-site request forgery was performed.
 * @returns A newly created state.
 */
export async function createState(): Promise<string> {
  const state = crypto.randomBytes(20).toString("hex");
  await db.state
    .create({
      data: { value: state },
      select: { value: true },
    })
    .catch((e) => {
      throw e;
    });
  return state;
}

/**
 * Deletes a state from the database
 * @description When using OAuth2 states, they need to be destroyed after having been used so as not to have collisions.
 * @param state The state string, or Prisma State object, to delete.
 */
export async function deleteState(state: State | string): Promise<void> {
  let stateString = typeof state === "string" ? state : state.value;
  await db.state
    .delete({
      where: {
        value: stateString,
      },
    })
    .catch((e) => {
      throw e;
    });
}

export async function getUserInfo(token: string) {
  try {
    const { data: info } = await twitchApi.get(
      `https://api.twitch.tv/helix/users`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const { id, login } = info.data[0];
    return {
      id,
      login,
    };
  } catch (e) {
    throw e;
  }
}
