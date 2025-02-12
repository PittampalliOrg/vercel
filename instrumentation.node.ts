/*instrumentation.ts*/
import * as opentelemetry from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-proto';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import * as traceloop from "@traceloop/node-server-sdk";
import { envDetectorSync, hostDetectorSync, processDetectorSync } from '@opentelemetry/resources';
// api.diag.setLogger(new api.DiagConsoleLogger(), api.DiagLogLevel.DEBUG);
import { BunyanInstrumentation } from '@opentelemetry/instrumentation-bunyan';
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";

  
const traceExporter =  new OTLPTraceExporter({
  url: 'http://otel-collector:4318/v1/traces'
});
const metricReader = new PeriodicExportingMetricReader({
  exporter: new OTLPMetricExporter({
    url: 'http://otel-collector:4318/v1/metrics'
  })
});
const logRecordExporter = new OTLPLogExporter({
  url: 'http://otel-collector:4318/v1/logs'
});

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
  logRecordProcessors: [new SimpleLogRecordProcessor(logRecordExporter)],
  instrumentations: [getNodeAutoInstrumentations({
    "@opentelemetry/instrumentation-fs": {
      enabled: false
    }
  }), new PgInstrumentation({
    enhancedDatabaseReporting: true,
    addSqlCommenterCommentToQueries: true
  }),
  new BunyanInstrumentation(),
  new UndiciInstrumentation()]
});

traceloop.initialize({ 
  disableBatch: true, 
  baseUrl: "http://otel-collector:4318"
});

sdk.start();

