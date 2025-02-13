"use client";

import { useEffect } from 'react';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';

export default function InitClient() {
  useEffect(() => {
  const provider = new WebTracerProvider({
      resource: new Resource({
        [ATTR_SERVICE_NAME]: 'browser', // Name for your client
      }),
      spanProcessors: [ new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: 'http://127.0.0.1:4318/v1/traces', // or your collector’s URL
        })
      )],
    });

    provider.register({
      // Use ZoneContextManager for better async context tracking in the browser
      contextManager: new ZoneContextManager(),
    });

    // Register browser-specific instrumentations
    registerInstrumentations({
      instrumentations: [
        new DocumentLoadInstrumentation(),
        new FetchInstrumentation({
          propagateTraceHeaderCorsUrls: [
            'http://localhost:3000',
            'http://localhost:3002',
            'http://localhost:3003',
          ],
        }),
        new XMLHttpRequestInstrumentation(),
        new UserInteractionInstrumentation({
          eventNames: ['click', 'submit', 'mousedown', 'keydown', 'keypress'],
        }),
      ],
    });

    console.log('Client instrumentation started.');
  }, []);

  // This component doesn't render anything itself
  return null;
}
