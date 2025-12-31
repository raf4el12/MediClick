import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import * as chalk from 'chalk';

interface LogMetadata {
  stack?: Array<{
    statusCode?: number;
    method?: string;
    url?: string;
    ip?: string;
    responseTime?: number;
    trace?: string;
    userAgent?: string;
  }>;
  context?: {
    statusCode?: number;
    method?: string;
    url?: string;
    ip?: string;
    responseTime?: number;
    trace?: string;
    userAgent?: string;
  };
}

export const winstonConfig: WinstonModuleOptions = {
  level: 'debug',
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.simple(),
        winston.format.timestamp(),
        winston.format.metadata({
          fillExcept: ['message', 'level', 'timestamp'],
        }),
        winston.format.printf((info) => {
          const { timestamp, level, message, metadata } = info;
          const meta = metadata as LogMetadata;
          const data = meta.stack?.[0] ?? meta.context ?? {};
          const {
            statusCode,
            method,
            url,
            ip,
            responseTime,
            trace,
            userAgent,
          } = data;

          return (
            `[${chalk.yellow(String(timestamp))}] ${level.toUpperCase()}: ${chalk.red(String(message))}\n` +
            `Method: ${chalk.blue(method ?? 'N/A')} | StatusCode: ${chalk.green(statusCode ?? 0)} | ResponseTime: ${chalk.cyan(responseTime ?? 0)}ms | URL: ${chalk.magenta(url ?? 'N/A')} | IP: ${chalk.cyan(ip ?? 'N/A')}\n` +
            `UserAgent: ${chalk.green(userAgent ?? 'N/A')}\n` +
            `Stack trace:\n${chalk.red(trace ?? 'No stack trace available')}`
          );
        }),
      ),
    }),
    new winston.transports.File({
      maxsize: 5120000,
      maxFiles: 5,
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.metadata({
          fillExcept: ['message', 'level', 'timestamp'],
        }),
        winston.format.printf((info) => {
          const { timestamp, level, message, metadata } = info;
          const meta = metadata as LogMetadata;
          const data = meta.stack?.[0] ?? meta.context ?? {};
          const {
            statusCode,
            method,
            url,
            ip,
            responseTime,
            trace,
            userAgent,
          } = data;

          return (
            `[${String(timestamp)}] ${level.toUpperCase()}: ${String(message)}\n` +
            `Method: ${method ?? 'N/A'} | StatusCode: ${statusCode ?? 0} | ResponseTime: ${responseTime ?? 0}ms | URL: ${url ?? 'N/A'} | IP: ${ip ?? 'N/A'}\n` +
            `UserAgent: ${userAgent ?? 'N/A'}\n` +
            `Stack trace:\n${trace ?? 'No stack trace available'}`
          );
        }),
      ),
    }),
    new winston.transports.File({
      maxsize: 5120000,
      maxFiles: 5,
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.metadata({
          fillExcept: ['message', 'level', 'timestamp'],
        }),
        winston.format.printf((info) => {
          const { timestamp, level, message, metadata } = info;
          const meta = metadata as LogMetadata;
          const data = meta.stack?.[0] ?? meta.context ?? {};
          const {
            statusCode,
            method,
            url,
            ip,
            responseTime,
            trace,
            userAgent,
          } = data;

          return (
            `[${String(timestamp)}] ${level.toUpperCase()}: ${String(message)}\n` +
            `Method: ${method ?? 'N/A'} | StatusCode: ${statusCode ?? 0} | ResponseTime: ${responseTime ?? 0}ms | URL: ${url ?? 'N/A'} | IP: ${ip ?? 'N/A'}\n` +
            `UserAgent: ${userAgent ?? 'N/A'}\n` +
            `Stack trace:\n${trace ?? 'No stack trace available'}`
          );
        }),
      ),
    }),
  ],
};
