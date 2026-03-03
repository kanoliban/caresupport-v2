import pino from "pino";
import { config } from "../config.js";

export const logger = pino({
  name: "caresupport-v2",
  level: config.nodeEnv === "production" ? "info" : "debug",
  transport:
    config.nodeEnv === "production"
      ? undefined
      : {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
          },
        },
});
