import crypto from "crypto";
import { PrismaClient, State } from "@prisma/client";

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
    .catch((err) => {
      throw err;
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
  await db.state.delete({ where: { value: stateString } }).catch((err) => {
    throw err;
  });
}
