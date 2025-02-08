// chat-metrics.ts
import { diag, DiagConsoleLogger, DiagLogLevel, metrics } from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

let userMessageCounter: ReturnType<ReturnType<MeterProvider['getMeter']>['createCounter']> | undefined;

export function startMetrics() {
  const exporter = new OTLPMetricExporter({ url: 'http://otel-collector:4318/v1/metrics' });
  const meterProvider = new MeterProvider({
    readers: [
      new PeriodicExportingMetricReader({
        exporter,
        exportIntervalMillis: 1000,
      }),
    ],
  });
  metrics.setGlobalMeterProvider(meterProvider);

  const meter = meterProvider.getMeter('my-chatbot-meter');
  userMessageCounter = meter.createCounter('ai_chatbot_user_messages', {
    description: 'Counts user-submitted messages in the chat UI',
  });
}

export function stopMetrics() {
  metrics.getMeterProvider().shutdown().then(() => metrics.disable());
}

/** Increment the user messages counter by 1. */
export function recordUserMessage() {
  if (!userMessageCounter) return;
  userMessageCounter.add(1, { environment: 'production' });
}
