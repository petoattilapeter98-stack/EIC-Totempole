/**
 * Minimal Bot Framework Direct Line 3.0 client -- just enough to run a
 * headless voice conversation (contracts/direct-line-client-contract.md).
 *
 * There is no secret anywhere in this flow (Constitution VI is satisfied
 * because there is nothing to protect, not because something is hidden
 * server-side): the bot's "Require secured access" setting is OFF, so
 * agentConfig.ts's DIRECT_LINE_PROVISION_TOKEN_URL is itself a public,
 * unauthenticated, CORS-open (`Access-Control-Allow-Origin: *`, verified)
 * endpoint that hands out a Direct Line token to anyone who asks -- exactly
 * what Copilot Studio's own hosted demo page calls internally
 * (research.md R12/R13). This app calls it directly.
 */

export interface DirectLineConversation {
  readonly conversationId: string;
  readonly token: string;
  readonly streamUrl: string;
}

export interface DirectLineActivity {
  readonly type: string;
  readonly id?: string;
  readonly from?: { readonly id: string; readonly name?: string };
  readonly text?: string;
}

interface DirectLineActivitySet {
  readonly watermark?: string;
  readonly activities?: readonly DirectLineActivity[];
}

/** This app's own identity for outgoing activities -- never a real visitor identifier. */
export const KIOSK_VISITOR_ID = 'kiosk-visitor';

const DIRECTLINE_BASE_URL = 'https://directline.botframework.com/v3/directline';

export class DirectLineError extends Error {}

interface ProvisionTokenResponse {
  readonly token?: string;
}

interface StartConversationResponse {
  readonly conversationId?: string;
  readonly token?: string;
  readonly streamUrl?: string;
}

/**
 * Starts a conversation in two steps, mirroring exactly what Copilot
 * Studio's own hosted demo page does (research.md R13):
 *  1. GET the bot's public, secretless provision-token endpoint.
 *  2. POST that token to Direct Line's own `/conversations` endpoint, which
 *     -- because the provisioned token already carries this specific bot's
 *     identity -- returns a live `streamUrl` for the same conversation.
 */
export async function startDirectLineConversation(
  provisionTokenUrl: string,
): Promise<DirectLineConversation> {
  const provisionResponse = await fetch(provisionTokenUrl);
  if (!provisionResponse.ok) {
    throw new DirectLineError(`provision-token endpoint returned ${provisionResponse.status}`);
  }
  const provisioned = (await provisionResponse.json()) as ProvisionTokenResponse;
  if (!provisioned.token) {
    throw new DirectLineError('provision-token response missing token');
  }

  const startResponse = await fetch(`${DIRECTLINE_BASE_URL}/conversations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${provisioned.token}` },
  });
  if (!startResponse.ok) {
    throw new DirectLineError(`start-conversation returned ${startResponse.status}`);
  }
  const started = (await startResponse.json()) as StartConversationResponse;
  if (!started.conversationId || !started.token || !started.streamUrl) {
    throw new DirectLineError('start-conversation response missing required fields');
  }
  return { conversationId: started.conversationId, token: started.token, streamUrl: started.streamUrl };
}

/** Posts a visitor's recognized speech as a Direct Line message activity. */
export async function postDirectLineMessage(
  conversation: DirectLineConversation,
  text: string,
  locale: string,
): Promise<void> {
  const response = await fetch(
    `${DIRECTLINE_BASE_URL}/conversations/${conversation.conversationId}/activities`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${conversation.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'message',
        from: { id: KIOSK_VISITOR_ID },
        text,
        locale,
      }),
    },
  );
  if (!response.ok) {
    throw new DirectLineError(`activity post returned ${response.status}`);
  }
}

/**
 * Opens the Direct Line WebSocket activity stream and invokes `onActivity`
 * for every activity NOT authored by this app itself (i.e. the bot's own
 * replies). Returns an unsubscribe function that closes the socket --
 * callers MUST call it on teardown (Constitution V: no leaked connection).
 *
 * Direct Line's WebSocket protocol sends periodic empty-string keepalive
 * frames (no `data`), which are silently ignored here rather than treated as
 * a parse error.
 */
export function subscribeToDirectLineActivities(
  streamUrl: string,
  onActivity: (activity: DirectLineActivity) => void,
  onError: () => void,
): () => void {
  const socket = new WebSocket(streamUrl);

  socket.onmessage = (event) => {
    if (typeof event.data !== 'string' || event.data.length === 0) {
      return;
    }
    let parsed: DirectLineActivitySet;
    try {
      parsed = JSON.parse(event.data) as DirectLineActivitySet;
    } catch {
      return;
    }
    for (const activity of parsed.activities ?? []) {
      if (activity.from?.id !== KIOSK_VISITOR_ID) {
        onActivity(activity);
      }
    }
  };

  socket.onerror = onError;

  return () => {
    socket.onmessage = null;
    socket.onerror = null;
    socket.close();
  };
}
