'use client';

import { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import {
  OAuthClientInformationSchema,
  OAuthClientInformation,
  OAuthTokens,
  OAuthTokensSchema,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { SESSION_KEYS } from "./constants";

class InspectorOAuthClientProvider implements OAuthClientProvider {
  get redirectUrl() {
    if (typeof window === 'undefined') return '';
    return window.location.origin + "/oauth/callback";
  }

  get clientMetadata() {
    return {
      redirect_uris: [this.redirectUrl],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_name: "MCP Inspector",
      client_uri: "https://github.com/modelcontextprotocol/inspector",
    };
  }

  async clientInformation() {
    if (typeof window === 'undefined') return undefined;
    
    const value = sessionStorage.getItem(SESSION_KEYS.CLIENT_INFORMATION);
    if (!value) {
      return undefined;
    }

    return await OAuthClientInformationSchema.parseAsync(JSON.parse(value));
  }

  saveClientInformation(clientInformation: OAuthClientInformation) {
    if (typeof window === 'undefined') return;
    
    sessionStorage.setItem(
      SESSION_KEYS.CLIENT_INFORMATION,
      JSON.stringify(clientInformation),
    );
  }

  async tokens() {
    if (typeof window === 'undefined') return undefined;
    
    const tokens = sessionStorage.getItem(SESSION_KEYS.TOKENS);
    if (!tokens) {
      return undefined;
    }

    return await OAuthTokensSchema.parseAsync(JSON.parse(tokens));
  }

  saveTokens(tokens: OAuthTokens) {
    if (typeof window === 'undefined') return;
    
    sessionStorage.setItem(SESSION_KEYS.TOKENS, JSON.stringify(tokens));
  }

  redirectToAuthorization(authorizationUrl: URL) {
    if (typeof window === 'undefined') return;
    
    window.location.href = authorizationUrl.href;
  }

  saveCodeVerifier(codeVerifier: string) {
    if (typeof window === 'undefined') return;
    
    sessionStorage.setItem(SESSION_KEYS.CODE_VERIFIER, codeVerifier);
  }

  codeVerifier() {
    if (typeof window === 'undefined') 
      throw new Error("No code verifier available in server context");
    
    const verifier = sessionStorage.getItem(SESSION_KEYS.CODE_VERIFIER);
    if (!verifier) {
      throw new Error("No code verifier saved for session");
    }

    return verifier;
  }
}

export const authProvider = new InspectorOAuthClientProvider();