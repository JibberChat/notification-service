import * as winston from 'winston';
import 'winston-daily-rotate-file';

// Create transports instance
const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.colorize(),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, context, trace }) => {
        const stackTrace = trace ? `\n${trace}` : '';
        return `${timestamp} [${context}] ${level}: ${message}${stackTrace}`;
      }),
    ),
  }),

  new winston.transports.DailyRotateFile({
    filename: 'logs/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
      winston.format.timestamp(), // Add a timestamp to file logs
      winston.format.json(),
    ),
  }),
];

// Create and export the logger instance
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports,
});
