import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/webhooks/linq/inbound",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payload = await request.json();
    await ctx.runAction(internal.process.processInboundMessage, payload);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }),
});

export default http;
