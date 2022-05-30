var _a;
import { Low, JSONFile } from "lowdb";
const file = new JSONFile("./oauth.json");
const oauth = new Low(file);
await oauth.read();
(_a = oauth.data) !== null && _a !== void 0 ? _a : (oauth.data = {
    discord: {
        token: "",
        refreshed: null,
        expiresIn: null,
    },
    twitch: {
        token: "",
        refreshed: null,
        expiresIn: null,
    },
});
