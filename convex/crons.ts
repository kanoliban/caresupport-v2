import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily reminder digest fires at 13:00 UTC.
// In US timezones this is approximately:
//   ET (UTC-4 DST):  9:00 AM
//   CT (UTC-5 DST):  8:00 AM
//   MT (UTC-6 DST):  7:00 AM
//   PT (UTC-7 DST):  6:00 AM
// Pilot users are mostly in CT/ET, so this is acceptable for v1. Future
// enhancement: per-user preferred-digest-time, fire hourly and gate by
// local time inside the action.
crons.daily(
  "daily-reminder-digest",
  { hourUTC: 13, minuteUTC: 0 },
  internal.reminders.dispatchDailyDigests,
);

export default crons;
