
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';
import { envDetectorSync, processDetectorSync, hostDetectorSync } from '@opentelemetry/resources';
import * as traceloop from '@traceloop/node-server-sdk';
import { logger } from "@/lib/logger"
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';


// --- Create Exporters ---
const traceExporter = new OTLPTraceExporter({
  url: 'http://alloy:4318/v1/traces',
});

const metricExporter = new OTLPMetricExporter({
  url: 'http://alloy:4318/v1/metrics',
});

const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
});

const logRecordExporter = new OTLPLogExporter({
  url: 'http://alloy:4318/v1/logs',
});

// --- Create NodeSDK ---
const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: 'frontend', // Name for your client
  }),
  traceExporter,
  metricReader,
  logRecordProcessors: [new BatchLogRecordProcessor(logRecordExporter)],
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
    new PgInstrumentation({
      enhancedDatabaseReporting: true,
      addSqlCommenterCommentToQueries: true,
    }),
    new UndiciInstrumentation(),
    new WinstonInstrumentation(),
  ],

});

// Start the SDK
sdk.start();

logger.info('Frontend instrumentation started');

// Traceloop optional: if you have special config
// traceloop.initialize({
//   disableBatch: true,
//   baseUrl: 'http://otel-collector:4318',
// });

// logger.info('Frontend started');