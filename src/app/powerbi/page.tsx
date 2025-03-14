"use client";

import React from "react";
import dynamic from "next/dynamic";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import * as config from "./Config";
import "./powerbi.css"; // (Your old App.css, renamed to powerbi.css)

// Dynamically load PowerBiApp to prevent SSR
const PowerBiAppNoSSR = dynamic(() => import("./PowerBIApp"), {
  ssr: false,
});

function generateMsalConfig() {
  return {
    auth: {
      clientId: config.clientId,
      authority: config.authorityUrl,
      redirectUri: "http://localhost:3000/powerbi",
    },
    cache: {
      cacheLocation: "sessionStorage",
      storeAuthStateInCookie: false,
    },
  };
}

const msalInstanceProvider = new PublicClientApplication(generateMsalConfig());

export default function PowerBiPage() {
  return (
    <MsalProvider instance={msalInstanceProvider}>
      <div id="welcome" style={{ marginBottom: "1rem", fontSize: "1.2rem" }}>
        Welcome, ...
      </div>
      <PowerBiAppNoSSR />
    </MsalProvider>
  );
}
