import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "expire stale outreach threads",
  { hours: 1 },
  internal.outreachCron.expireStaleThreads,
);

export default crons;
