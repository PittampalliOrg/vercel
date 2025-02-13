/*instrumentation.ts*/
import * as opentelemetry from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { ConsoleLogRecordExporter, LoggerProvider, SimpleLogRecordProcessor, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import * as traceloop from "@traceloop/node-server-sdk";
import { envDetectorSync, hostDetectorSync, processDetectorSync } from '@opentelemetry/resources';
// api.diag.setLogger(new api.DiagConsoleLogger(), api.DiagLogLevel.DEBUG);
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { Logger, createLogger, transports, level, format } from 'winston';
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';
import { trace, Span } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { logs } from '@opentelemetry/api-logs';

const logRecordExporter = new OTLPLogExporter({
  url: 'http://otel-collector:4318/v1/logs'
});

const traceExporter =  new OTLPTraceExporter({
  url: 'http://otel-collector:4318/v1/traces'
});
const metricReader = new PeriodicExportingMetricReader({
  exporter: new OTLPMetricExporter({
    url: 'http://otel-collector:4318/v1/metrics'
  })
});

const tracerProvider = new NodeTracerProvider();
tracerProvider.register();

const loggerProvider = new LoggerProvider();
// Add a processor to export log record
loggerProvider.addLogRecordProcessor(
    new BatchLogRecordProcessor(logRecordExporter)
);
logs.setGlobalLoggerProvider(loggerProvider);


const sdk = new opentelemetry.NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'frontend',
    [ATTR_SERVICE_VERSION]: '1.0.0'
  }),
  resourceDetectors: [
    envDetectorSync,
    processDetectorSync,
    hostDetectorSync
  ],
  traceExporter: traceExporter,
  metricReader: metricReader,
  logRecordProcessors: [],
  instrumentations: [getNodeAutoInstrumentations({
    "@opentelemetry/instrumentation-fs": {
      enabled: false
    }
  }), new PgInstrumentation({
    enhancedDatabaseReporting: true,
    addSqlCommenterCommentToQueries: true
  }),
  new UndiciInstrumentation()]
});

traceloop.initialize({ 
  disableBatch: true, 
  baseUrl: "http://otel-collector:4318"
});

export const logger = createLogger({
  transports: [new transports.File({ filename: 'logs/combined.log' }),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.Console()
  ],
})
const tracer = trace.getTracer('example-tracer');
tracer.startActiveSpan('main', (span: Span) => {
    span.addEvent('main started');
    logger.info('log from main', span.spanContext());
    span.end();
    });

sdk.start();

