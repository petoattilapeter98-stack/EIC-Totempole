/**
 * Microsoft Copilot Studio agent reference (routing agent covering Innovation
 * Centre, company, and employee questions -- spec.md Knowledge Domains),
 * published 2026-09-10 with Web Channel Security's "Require secured access"
 * OFF -- i.e. reachable without a signed-in Microsoft identity AND without
 * any client-held secret (see research.md R12/R13).
 */
const ENVIRONMENT_ID = 'Default-371cb917-b098-4303-b878-c182ec8403ac';
const BOT_SCHEMA_NAME = 'cre88_noauthroutingagent_FUwQYD';

/**
 * This URL is kept here for reference/manual testing only (Copilot Studio's
 * own hosted demo page for this bot) -- it is NOT what the kiosk embeds. See
 * DIRECT_LINE_PROVISION_TOKEN_URL below for what the kiosk actually calls.
 */
export const COPILOT_STUDIO_DEMO_URL = `https://copilotstudio.microsoft.com/environments/${ENVIRONMENT_ID}/bots/${BOT_SCHEMA_NAME}/webchat?__version__=2&enableFileAttachment=false&cliAgent=true`;

/**
 * A public, unauthenticated endpoint that provisions a Direct Line token for
 * this specific bot -- no secret, no server-side proxy, no sign-in. This is
 * the exact endpoint the Copilot Studio demo page above calls itself; found
 * by inspecting that page's own network traffic (research.md R13), not
 * published in general API docs. It returns `Access-Control-Allow-Origin: *`
 * (verified directly), confirming it is meant to be called from any public
 * web page -- consistent with this bot's "no required authentication"
 * deployment choice.
 */
export const DIRECT_LINE_PROVISION_TOKEN_URL = `https://default371cb917b0984303b878c182ec8403.ac.environment.api.powerplatform.com/copilotstudio/agenticruntime/botsbyschema/${BOT_SCHEMA_NAME}/directline/token?api-version=2022-03-01-preview`;
