import winston from 'winston';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const devFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}] ${stack || message}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format:
    process.env.NODE_ENV === 'production'
      ? combine(timestamp(), errors({ stack: true }), json())
      : combine(
          colorize(),
          timestamp({ format: 'HH:mm:ss' }),
          errors({ stack: true }),
          devFormat
        ),
  transports: [new winston.transports.Console()],
});
