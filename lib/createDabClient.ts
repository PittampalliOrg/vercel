import { createDabClient, type DabClient } from "../../clients/generated-clients/client/dabClient";
import { AnonymousAuthenticationProvider } from "@microsoft/kiota-abstractions";
import {
  registerDefaultSerializer,
  registerDefaultDeserializer,
} from "@microsoft/kiota-abstractions";
import {
  JsonSerializationWriterFactory,
  JsonParseNodeFactory,
} from "@microsoft/kiota-serialization-json";
import { KiotaClientFactory, RetryHandler, RedirectHandler, ParametersNameDecodingHandler, UserAgentHandler, HeadersInspectionHandler, FetchRequestAdapter } from "@microsoft/kiota-http-fetchlibrary";

// some function that configures and returns your main Kiota-based client
const http = KiotaClientFactory.create(undefined, [
  new RetryHandler(), new RedirectHandler(), new ParametersNameDecodingHandler(), new UserAgentHandler(),  new HeadersInspectionHandler()
])

registerDefaultSerializer(JsonSerializationWriterFactory);
registerDefaultDeserializer(JsonParseNodeFactory);

const authProvider = new AnonymousAuthenticationProvider();
const parseNodeFactory = new JsonParseNodeFactory();
const serializationWriterFactory = new JsonSerializationWriterFactory();

// Create request adapter using the fetch-based implementation
const adapter = new FetchRequestAdapter(authProvider, parseNodeFactory, serializationWriterFactory, http);
adapter.baseUrl = "http://frontend_dapr:3500/v1.0/invoke/dab/method/api";

export const createNewDabClient = (): DabClient => {
    return createDabClient(adapter);
}
