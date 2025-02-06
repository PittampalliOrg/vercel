"use client";

import React, { createRef, Component } from "react";
import { MsalContext } from "@azure/msal-react";
import { service, factories, models, IEmbedConfiguration } from "powerbi-client";
import { EventMessage, EventType, AuthenticationResult } from "@azure/msal-browser";
import * as config from "./Config";

const powerbi = new service.Service(factories.hpmFactory, factories.wpmpFactory, factories.routerFactory);

let accessToken = "";
let embedUrl = "";
let reportContainer: HTMLElement;
let reportRef = createRef<HTMLDivElement>();

interface AppProps {}
interface AppState {
  accessToken: string;
  embedUrl: string;
  error: string[];
}

export default class PowerBiApp extends Component<AppProps, AppState> {
  static contextType = MsalContext;

  constructor(props: AppProps) {
    super(props);
    this.state = { accessToken: "", embedUrl: "", error: [] };
  }

  render(): JSX.Element {
    // If there's an error, display it
    if (this.state.error.length) {
      if (reportContainer) {
        reportContainer.textContent = "";
        this.state.error.forEach((line) => {
          reportContainer.appendChild(document.createTextNode(line));
          reportContainer.appendChild(document.createElement("br"));
        });
      }
    }
    // If we have tokens and an embed URL, embed the report
    else if (this.state.accessToken && this.state.embedUrl && reportContainer) {
      const embedConfig: IEmbedConfiguration = {
        type: "report",
        tokenType: models.TokenType.Aad,
        accessToken,
        embedUrl,
        id: config.reportId,
      };

      const report = powerbi.embed(reportContainer, embedConfig);
      report.off("loaded");
      report.on("loaded", () => console.log("Report load successful"));
      report.off("rendered");
      report.on("rendered", () => console.log("Report render successful"));
      report.off("error");
      report.on("error", (event: CustomEvent) => {
        console.error(event.detail);
      });
      report.off("dataSelected");

      // report.on will add an event listener.
      report.on("dataSelected", function (event: { detail: any; }) {
          let data = event.detail;
          console.log("Event - dataSelected:\n", data);
});
    }

    // Container’s default “loading” or error text
    return (
      <div id="reportContainer" ref={reportRef}>
        Loading the report...
      </div>
    );
  }

  componentDidMount(): void {
    if (reportRef.current) {
      reportContainer = reportRef.current;
    }

    if (!config.workspaceId || !config.reportId) {
      this.setState({
        error: ["Please assign values to workspaceId and reportId in Config.ts"],
      });
      return;
    }

    this.authenticate();
  }

  componentDidUpdate(): void {
    this.authenticate();
  }

  componentWillUnmount(): void {
    if (reportContainer) {
      powerbi.reset(reportContainer);
    }
  }

  authenticate(): void {
    const msalInstance = (this.context as any).instance;
    const msalAccounts = (this.context as any).accounts;
    const msalInProgress = (this.context as any).inProgress;
    const isAuthenticated = msalAccounts.length > 0;

    if (this.state.error.length > 0) return;

    // Type your callback param as EventMessage
    const eventCallback = msalInstance.addEventCallback((message: EventMessage) => {
      if (message.eventType === EventType.LOGIN_SUCCESS && !accessToken) {
        const payload = message.payload as AuthenticationResult;
        const name = payload.account?.name ?? "";

        accessToken = payload.accessToken;
        this.setUsername(name);
        this.tryRefreshUserPermissions();
      }
    });

    const loginRequest = {
      scopes: config.scopeBase,
      account: msalAccounts[0],
    };

    // Trigger the login if we are not authenticated
    if (!isAuthenticated && msalInProgress === "none") {
      msalInstance.loginRedirect(loginRequest);
    }
    // If we have an access token but no embedUrl, get it
    else if (isAuthenticated && accessToken && !embedUrl) {
      this.getEmbedUrl();
      msalInstance.removeEventCallback(eventCallback);
    }
    // If authenticated but no token, do silent token retrieval
    else if (isAuthenticated && !accessToken && !embedUrl && msalInProgress === "none") {
      this.setUsername(msalAccounts[0].name);
      msalInstance
        .acquireTokenSilent(loginRequest)
        .then((response: AuthenticationResult) => {
          accessToken = response.accessToken;
          this.getEmbedUrl();
        })
        .catch((error: any) => {
          if (
            error.errorCode === "consent_required" ||
            error.errorCode === "interaction_required" ||
            error.errorCode === "login_required"
          ) {
            msalInstance.acquireTokenRedirect(loginRequest);
          } else if (error.errorCode === "429") {
            this.setState({
              error: ["Our STS is overloaded. Please try again later."],
            });
          } else {
            this.setState({
              error: ["Error fetching access token: " + error.toString()],
            });
          }
        });
    }
  }

  tryRefreshUserPermissions(): void {
    fetch(config.powerBiApiUrl + "v1.0/myorg/RefreshUserPermissions", {
      headers: {
        Authorization: "Bearer " + accessToken,
      },
      method: "POST",
    })
      .then((response: Response) => {
        if (response.ok) {
          console.log("User permissions refreshed successfully.");
        } else if (response.status === 429) {
          console.error("Permissions refresh is throttled. Try again later.");
        } else {
          console.error(response);
        }
      })
      .catch((error: any) => {
        console.error("Failure in making API call." + error);
      });
  }

  getEmbedUrl(): void {
    const errorMessage: string[] = [
      "Error occurred while fetching the embed URL of the report",
    ];

    fetch(`${config.powerBiApiUrl}v1.0/myorg/groups/${config.workspaceId}/reports/${config.reportId}`, {
      headers: {
        Authorization: "Bearer " + accessToken,
      },
      method: "GET",
    })
      .then((response: Response) => {
        errorMessage.push("Request Id: " + response.headers.get("requestId"));
        response
          .json()
          .then((body: any) => {
            if (response.ok) {
              embedUrl = body["embedUrl"];
              this.setState({ accessToken, embedUrl });
            } else {
              errorMessage.push("Error " + response.status + ": " + body.error.code);
              this.setState({ error: errorMessage });
            }
          })
          .catch(() => {
            errorMessage.push("Error " + response.status + ": An error has occurred");
            this.setState({ error: errorMessage });
          });
      })
      .catch((error: any) => {
        this.setState({ error: [error.toString()] });
      });
  }

  setUsername(username: string): void {
    const welcome = document.getElementById("welcome");
    if (welcome) welcome.innerText = "Welcome, " + username;
  }
}
