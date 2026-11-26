import { extractIntentAndDelta } from "./intent.ts";
import {
  initialState,
  mergeConversationState,
  commitRetrievedState,
} from "./state.ts";
import { queryAndFilterCanonicalRecords } from "./canonicalStore.ts";
import { verifyAndRenderResponse } from "./verifier.ts";
export async function runChatPipeline(messages: any[], previous: any = null) {
  const question =
    messages.filter((m) => m.role === "user").at(-1)?.content || "";
  let prev = initialState(previous);
  // Old clients may provide text history without a signed state. Recover only
  // user-supplied intent/requirements; assistant prose is never fact evidence.
  if (!previous && messages.length > 1) {
    for (const message of messages
      .slice(0, -1)
      .filter((m) => m.role === "user")) {
      const d = await extractIntentAndDelta(message.content, prev, []);
      prev = mergeConversationState(prev, d);
    }
  }
  const delta = await extractIntentAndDelta(question, prev, messages);
  const state = mergeConversationState(prev, delta);
  const retrieval = await queryAndFilterCanonicalRecords(
    state,
    delta,
    messages,
  );
  const response = verifyAndRenderResponse(retrieval, state);
  const visibleIds = retrieval.candidateIds.filter(
    (id) => !retrieval.context?.suggestionIds?.includes(id),
  );
  const all = retrieval.context?.allRecords || retrieval.records;
  const next = commitRetrievedState(state, all, visibleIds, retrieval.context);
  return { ...response, state: next };
}
