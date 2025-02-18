import { logs } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import {
    LoggerProvider,
    SimpleLogRecordProcessor,
    ConsoleLogRecordExporter
} from '@opentelemetry/sdk-logs';
import { OpenTelemetryTransportV3 } from '@opentelemetry/winston-transport';
import { createLogger, transports, format } from 'winston';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { pino, transport } from "pino"
import callsite from 'callsite';
import { stack } from 'callsite';

const callsiteFormat = format((info) => {
  // The callsite library returns an array of stack frames
  // callsite()[0] = this function, callsite()[1] = the caller of this function, etc.
  const site = callsite()[1]; // might adjust index based on your wrapper functions
  if (site) {
    const filename = site.getFileName();
    const line = site.getLineNumber();
    const functionName = site.getFunctionName()
    console.log('filename', filename, 'line', line, 'functionName', functionName);
    // Attach them to the info object so they appear in your logs
    info.file = filename;
    info.line = line;
    info.function = functionName;
  }

  return info;
});

function baz() {
  console.log();
  stack().forEach(function(site){
    console.log('  \x1b[36m%s\x1b[90m in %s:%d\x1b[0m'
      , site.getFunctionName() || 'anonymous'
      , site.getFileName()
      , site.getLineNumber());
  });
  console.log();
}


const logRecordExporter = new OTLPLogExporter({
  url: 'http://otel-collector:4318/v1/logs',
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
    callsiteFormat(),
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new OpenTelemetryTransportV3({
    })
  ]
});