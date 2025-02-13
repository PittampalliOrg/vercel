"use client";
import { Resource, detectResourcesSync } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { browserDetector } from '@opentelemetry/opentelemetry-browser-detector';
import { BatchSpanProcessor, WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';
import { useEffect } from 'react';


export default function InitHighlight() {
  useEffect(() => {
  let resource= new Resource({
    [ATTR_SERVICE_NAME]: 'browser',
  });
  const provider = new WebTracerProvider({
    resource,
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({ url: "http://localhost:4318/v1/traces", headers: {} })
      )
    ]
  });

  provider.register({
    // Changing default contextManager to use ZoneContextManager - supports asynchronous operations - optional
    contextManager: new ZoneContextManager(),
  });

// Registering instrumentations

  registerInstrumentations({
    instrumentations: [
      new DocumentLoadInstrumentation(),
      new XMLHttpRequestInstrumentation({
        ignoreUrls: [/localhost/],
        propagateTraceHeaderCorsUrls: [
          'http://localhost:3000',
          'http://localhost:3002',
        ],
      }),
      new FetchInstrumentation(),
      new UserInteractionInstrumentation({
        eventNames: ['submit', 'click', 'keypress']
      })
    ],
  });

console.log("Instrumentation started");
}, []);
  return null;
}




