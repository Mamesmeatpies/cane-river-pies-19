import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Tuesday 14:00 UTC. This is 9:00 AM during CDT and 8:00 AM during CST.
crons.cron(
  "marketing-tuesday-social-pack",
  "0 14 * * 2",
  internal.marketingGenerator.generateScheduledPack,
  { mode: "social" }
);

// Friday 20:00 UTC. This is 3:00 PM during CDT and 2:00 PM during CST.
crons.cron(
  "marketing-friday-weekly-notes-pack",
  "0 20 * * 5",
  internal.marketingGenerator.generateScheduledPack,
  { mode: "weekly" }
);

export default crons;
