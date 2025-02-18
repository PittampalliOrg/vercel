
import opentelemetry from '@opentelemetry/sdk-node';
import { logs, api } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { BatchLogRecordProcessor, ConsoleLogRecordExporter, SimpleLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { envDetectorSync, processDetectorSync, hostDetectorSync } from '@opentelemetry/resources';
import * as traceloop from '@traceloop/node-server-sdk';
import { logger } from "@/lib/logger"


// --- Create Exporters ---
const traceExporter = new OTLPTraceExporter({
  url: 'http://otel-collector:4318/v1/traces',
});

const metricExporter = new OTLPMetricExporter({
  url: 'http://otel-collector:4318/v1/metrics',
});

const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
});

// const logRecordExporter = new OTLPLogExporter({
//   url: 'http://otel-collector:4318/v1/logs',
// });

// --- Create NodeSDK ---
const sdk = new opentelemetry.NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'frontend',
    [ATTR_SERVICE_VERSION]: '1.0.0',
  }),
  resourceDetectors: [envDetectorSync, processDetectorSync, hostDetectorSync],
  traceExporter,
  metricReader,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
    new PgInstrumentation({
      enhancedDatabaseReporting: true,
      addSqlCommenterCommentToQueries: true,
    }),
    new UndiciInstrumentation()
  ],

});

// Start the SDK
sdk.start();

// Traceloop optional: if you have special config
traceloop.initialize({
  disableBatch: true,
  baseUrl: 'http://otel-collector:4318',
});

logger.info('Frontend started');