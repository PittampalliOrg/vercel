/*instrumentation.ts*/
import * as opentelemetry from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

const traceExporter =  new OTLPTraceExporter({
  url: 'http://otel-collector:4318/v1/traces'
})

const sdk = new opentelemetry.NodeSDK({
  traceExporter: traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
