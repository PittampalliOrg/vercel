// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
// ----------------------------------------------------------------------------


// Scope Base of AAD app. Use the below configuration to use all the permissions provided in the AAD app through Azure portal.
// Refer https://aka.ms/PowerBIPermissions for complete list of Power BI scopes

// URL used for initiating authorization request
export const authorityUrl: string = "https://login.microsoftonline.com/common/";

// End point URL for Power BI API
export const powerBiApiUrl: string = "https://api.powerbi.com/";

// Scope for securing access token
export const scopeBase: string[] = ["https://analysis.windows.net/powerbi/api/Report.Read.All"];

// Client Id (Application Id) of the AAD app.
export const clientId: string = "af765b7e-7417-4c4e-82e3-fb88a2762147";

// Id of the workspace where the report is hosted
export const workspaceId: string = "8986808f-6c68-4a91-b3c4-1a38bfa8d7e1";

// Id of the report to be embedded
export const reportId: string = "27042749-002d-40a9-a1a4-7b1387cfa425";