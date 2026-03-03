import { query } from "./_generated/server";

export const getMigrationIntegrityState = query({
  args: {},
  handler: async (ctx) => {
    return ctx.runQuery("ops_v2:getMigrationIntegrityState", {});
  },
});
