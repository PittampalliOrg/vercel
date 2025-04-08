import { logs } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import {
    LoggerProvider,
    SimpleLogRecordProcessor,
    ConsoleLogRecordExporter
} from '@opentelemetry/sdk-logs';
import { OpenTelemetryTransportV3 } from '@opentelemetry/winston-transport';
import { createLogger, transports, format } from 'winston';

const logRecordExporter = new OTLPLogExporter({
  url: 'http://alloy:4318/v1/logs',
});


// To start a logger, you first need to initialize the Logger provider.
const loggerProvider = new LoggerProvider();
// Add a processor to export log record
loggerProvider.addLogRecordProcessor(
    new SimpleLogRecordProcessor(logRecordExporter)
);
logs.setGlobalLoggerProvider(loggerProvider);

export const logger = createLogger({
  level: 'debug',
  format: format.combine(
    format.colorize(),
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level}]: ${message}`;
    })
  ),
  transports: [
    new transports.Console(),
    new OpenTelemetryTransportV3()
  ]
});