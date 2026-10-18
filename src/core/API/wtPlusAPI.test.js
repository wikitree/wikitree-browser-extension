import { wtAPIProfileSearch } from "./wtPlusAPI";

// WT+'s "Blocked request" page (Murray, 2026-10-18): a 429 for an IP range blocked because of AI bot traffic.
const BLOCK_PAGE =
  "<h1>Blocked request</h1><p>Your request was blocked since it originates from an IP range blocked due to AI bots activity.</p>" +
  '<p>If you are a WikiTree user send a <a href="#">private message to Aleš</a> including your IP: <b>192.0.2.7</b> and he will unblock you.</p>';

const respond = (status, body, statusText = "") => {
  global.fetch = jest.fn(async () => ({ ok: status === 200, status, statusText, text: async () => body, json: async () => JSON.parse(body) }));
};

test("the block page: status, blocked, IP", async () => {
  respond(429, BLOCK_PAGE);
  await expect(wtAPIProfileSearch("ChatWTPlus", "Notables")).rejects.toMatchObject({ status: 429, blocked: true, ip: "192.0.2.7", message: "HTTP 429" });
});

test("another refusal is not the block", async () => {
  respond(503, "busy", "Service Unavailable");
  await expect(wtAPIProfileSearch("ChatWTPlus", "Notables")).rejects.toMatchObject({ status: 503, blocked: false, ip: "", message: "Service Unavailable" });
});

test("a good answer", async () => {
  respond(200, '{"response":{"found":0}}');
  await expect(wtAPIProfileSearch("ChatWTPlus", "Notables")).resolves.toEqual({ response: { found: 0 } });
});
