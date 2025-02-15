import { createLogger, format, transports } from "winston";


export const logger = createLogger({
    level: 'info',
    format: format.json(),
    transports: [
      new transports.File({ filename: 'logs/combined.log' }),
      new transports.File({ filename: 'logs/error.log', level: 'error' }),
      new transports.Console(),
    ],
  });
  