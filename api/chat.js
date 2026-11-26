import { runChatPipeline } from "../lib/chat/runtime.js";
import {
  attachState,
  readConversationState,
  requestStatus,
  sanitiseMessages,
  cors,
} from "../lib/chat/runtime.js";
// Compatibility exports for public parser/service contracts. These functions
// read data only and cannot dispatch a chat response.
export {
  requestedPlaceTimeConstraint,
  placeOpenAtConstraint,
  extractWxListingEventCards,
  parseLooseExperienceDateRange,
  extractExperienceListingEventCards,
  stripInternalProcessLeakage,
} from "../lib/chat/runtime.js";
export default async function handler(req, res) {
  cors(req, res);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-AskWakefield-Build", "unified-v1-2026-11-26");
  res.setHeader("X-AskWakefield-Pipeline", "unified-v1");
  res.setHeader(
    "X-AskWakefield-Commit",
    process.env.VERCEL_GIT_COMMIT_SHA || process.env.AW_BUILD_SHA || "local",
  );
  const status = requestStatus(req);
  if (status === 204) return res.status(200).end();
  if (status !== 200)
    return res.status(status).json({
      error: status === 429 ? "rate_limit_exceeded" : "method_not_allowed",
      reply:
        status === 429
          ? "Please wait a minute before trying again."
          : undefined,
    });
  const messages = sanitiseMessages(req.body?.messages);
  if (!messages)
    return res.status(400).json({
      error: "invalid_request",
      reply: "Please enter a valid question.",
    });
  const previous = readConversationState(req);
  try {
    const result = await runChatPipeline(messages, previous);
    const stateToken = attachState(res, result.state);
    return res.status(200).json({ ...result, stateToken });
  } catch (error) {
    console.error("Unified chat pipeline failed:", error.message);
    return res.status(503).json({
      error: "service_unavailable",
      reply: "I couldn’t complete that check just now. Please try again.",
    });
  }
}
