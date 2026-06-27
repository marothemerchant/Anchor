import { useState, useRef, useCallback } from "react";

export type MessageRole = "user" | "assistant";
export type MessageStatus = "streaming" | "done" | "error";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  status: MessageStatus;
  elapsed?: number;
}

export type Provider = "openai" | "gemini" | "groq" | "anchor";

export interface AgentSettings {
  openaiKey: string;
  geminiKey: string;
  groqKey: string;
  anchorKey: string;
  systemPrompt: string;
  temperature: number;
  model: string;
}

export interface KeyStatus {
  openai: "idle" | "checking" | "ok" | "error";
  gemini: "idle" | "checking" | "ok" | "error";
  groq: "idle" | "checking" | "ok" | "error";
  anchor: "idle" | "checking" | "ok" | "error";
}

// Anchor Browser session tracking
export interface AnchorSession {
  sessionId: string;
  createdAt: Date;
  lastUsed: Date;
}

export function getProvider(model: string): Provider {
  if (model.startsWith("gpt-")) return "openai";
  if (model.startsWith("gemini-")) return "gemini";
  if (model === "anchor-web-task") return "anchor";
  return "groq";
}

export function getActiveKey(settings: AgentSettings): string {
  const p = getProvider(settings.model);
  if (p === "openai") return settings.openaiKey;
  if (p === "gemini") return settings.geminiKey;
  if (p === "anchor") return settings.anchorKey;
  return settings.groqKey;
}

async function streamOpenAICompat(
  endpoint: string,
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  temperature: number,
  onChunk: (text: string) => void,
  signal: AbortSignal
): Promise<void> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature, stream: true }),
    signal,
  });
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onChunk(content);
      } catch { /* ignore */ }
    }
  }
}

async function streamGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: Message[],
  userTask: string,
  temperature: number,
  onChunk: (text: string) => void,
  signal: AbortSignal
): Promise<void> {
  const contents: { role: string; parts: { text: string }[] }[] = [];
  for (const msg of history) {
    if (msg.status !== "done") continue;
    contents.push({ role: msg.role === "assistant" ? "model" : "user", parts: [{ text: msg.content }] });
  }
  contents.push({ role: "user", parts: [{ text: userTask }] });

  const body: Record<string, unknown> = { contents, generationConfig: { temperature } };
  if (systemPrompt.trim()) body.system_instruction = { parts: [{ text: systemPrompt }] };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      try {
        const parsed = JSON.parse(data);
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) onChunk(text);
      } catch { /* ignore */ }
    }
  }
}

/**
 * Extract output from Anchor Browser API response.
 * Handles various response shapes: { data, result, output, extracted_text, screenshot, elements, success, etc. }
 */
function extractAnchorOutput(response: Record<string, any>): string {
  // Direct success message
  if (response.success && typeof response.success === "string") {
    return response.success;
  }

  // Extracted text content
  if (response.extracted_text) {
    return typeof response.extracted_text === "string"
      ? response.extracted_text
      : JSON.stringify(response.extracted_text, null, 2);
  }

  // Common response fields
  if (response.data) {
    return typeof response.data === "string"
      ? response.data
      : JSON.stringify(response.data, null, 2);
  }

  if (response.result) {
    return typeof response.result === "string"
      ? response.result
      : JSON.stringify(response.result, null, 2);
  }

  if (response.output) {
    return typeof response.output === "string"
      ? response.output
      : JSON.stringify(response.output, null, 2);
  }

  // Element detection results
  if (response.elements && Array.isArray(response.elements)) {
    return `Found ${response.elements.length} elements:\n${JSON.stringify(response.elements, null, 2)}`;
  }

  // Screenshot confirmation
  if (response.screenshot) {
    return `[Screenshot captured: ${typeof response.screenshot === "string" ? response.screenshot : "image data"}]`;
  }

  // Screenshot URL
  if (response.screenshot_url) {
    return `[Screenshot: ${response.screenshot_url}]`;
  }

  // Fallback: return entire response as JSON
  return JSON.stringify(response, null, 2);
}

/**
 * Execute an Anchor Browser task with optional session persistence.
 * Supports multi-step workflows via sessionId.
 */
async function runAnchorWebTask(
  apiKey: string,
  task: string,
  sessionId: string | null,
  onChunk: (text: string) => void
): Promise<{ sessionId: string | null; error?: string }> {
  const payload: Record<string, any> = {
    prompt: task,
    detect_elements: true, // Help Anchor find clickable elements
    headless: true,        // Run in headless mode
  };

  // Add URL if task contains a URL-like pattern (optional enhancement)
  const urlMatch = task.match(https?:\/\/[^\s]+/);
  if (urlMatch) {
    payload.url = urlMatch[0];
  }

  // Use existing session for multi-step workflows
  if (sessionId) {
    payload.sessionId = sessionId;
  }

  try {
    const response = await fetch("https://api.anchorbrowser.io/v1/tools/perform-web-task", {
      method: "POST",
      headers: {
        "anchor-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        sessionId: null,
        error: `Anchor API Error (${response.status}): ${errorText}`,
      };
    }

    const data = await response.json();

    // Extract and stream the output
    const output = extractAnchorOutput(data);
    for (const char of output) {
      onChunk(char);
      await new Promise((r) => setTimeout(r, 4)); // Simulate streaming
    }

    // Return sessionId if provided in response (for multi-step workflows)
    const newSessionId = data.sessionId || sessionId;

    return { sessionId: newSessionId };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      sessionId: null,
      error: `Network error: ${errorMsg}. Check CORS or API key validity.`,
    };
  }
}

/**
 * Create a new Anchor Browser session.
 * Useful for multi-step workflows to maintain browser state.
 */
async function createAnchorSession(apiKey: string): Promise<string | null> {
  try {
    const response = await fetch("https://api.anchorbrowser.io/v1/sessions", {
      method: "POST",
      headers: {
        "anchor-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.sessionId || data.id || null;
  } catch {
    return null;
  }
}

export async function validateKey(provider: Provider, key: string): Promise<boolean> {
  if (!key.trim()) return false;
  try {
    if (provider === "openai") {
      const r = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      // CORS preflight passes for OpenAI — treat non-401/403 as ok
      return r.status !== 401 && r.status !== 403;
    }
    if (provider === "gemini") {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
      );
      return r.ok;
    }
    if (provider === "groq") {
      const r = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      return r.status !== 401 && r.status !== 403;
    }
    if (provider === "anchor") {
      // Try creating a session to validate the key.
      // This is the most reliable way to check Anchor API key validity.
      const r = await fetch("https://api.anchorbrowser.io/v1/sessions", {
        method: "POST",
        headers: {
          "anchor-api-key": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      // Accept 200/201 as valid. 401/403 or network errors indicate invalid key.
      return r.status === 200 || r.status === 201;
    }
  } catch {
    // CORS network error — if key is non-empty, assume it may be valid.
    // Actual errors will surface on first task execution.
    return true;
  }
  return false;
}

export function useAnchorAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [keyStatus, setKeyStatus] = useState<KeyStatus>({
    openai: "idle",
    gemini: "idle",
    groq: "idle",
    anchor: "idle",
  });

  const [settings, setSettings] = useState<AgentSettings>({
    openaiKey: import.meta.env.VITE_OPENAI_API_KEY ?? "",
    geminiKey: import.meta.env.VITE_GEMINI_API_KEY ?? "",
    groqKey: import.meta.env.VITE_GROQ_API_KEY ?? "",
    anchorKey: import.meta.env.VITE_ANCHOR_API_KEY ?? "",
    systemPrompt: "You are ANCHOR AGENT, a precise terminal AI. Be concise and direct.",
    temperature: 0.7,
    model: "gpt-4o",
  });

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Track Anchor session for multi-step workflows
  const anchorSessionRef = useRef<string | null>(null);

  const updateSetting = useCallback(<K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const checkKey = useCallback(async (provider: Provider) => {
    const s = settingsRef.current;
    const key = provider === "openai" ? s.openaiKey
      : provider === "gemini" ? s.geminiKey
      : provider === "groq" ? s.groqKey
      : s.anchorKey;

    if (!key.trim()) {
      setKeyStatus((prev) => ({ ...prev, [provider]: "idle" }));
      return;
    }
    setKeyStatus((prev) => ({ ...prev, [provider]: "checking" }));
    const ok = await validateKey(provider, key);
    setKeyStatus((prev) => ({ ...prev, [provider]: ok ? "ok" : "error" }));
  }, []);

  const checkAllKeys = useCallback(async () => {
    const providers: Provider[] = ["openai", "gemini", "groq", "anchor"];
    await Promise.all(providers.map((p) => checkKey(p)));
  }, [checkKey]);

  const sendTask = useCallback((task: string) => {
    if (!task.trim()) return;

    const s = settingsRef.current;
    const history = messagesRef.current;
    const provider = getProvider(s.model);
    const apiKey = getActiveKey(s);
    const assistantMsgId = crypto.randomUUID();
    const startTime = Date.now();

    const newUserMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: task,
      timestamp: new Date(),
      status: "done",
    };
    const newAssistantMsg: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      status: "streaming",
    };

    setMessages((prev) => [...prev, newUserMsg, newAssistantMsg]);

    const onChunk = (text: string) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId ? { ...msg, content: msg.content + text } : msg
        )
      );
    };

    const finishMessage = (status: "done" | "error", errorMsg?: string) => {
      const elapsed = (Date.now() - startTime) / 1000;
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== assistantMsgId) return msg;
          return {
            ...msg,
            status,
            elapsed,
            content: errorMsg
              ? (msg.content ? msg.content + "\n\n" : "") + `error: ${errorMsg}`
              : msg.content,
          };
        })
      );
    };

    if (provider === "anchor") {
      if (!apiKey) { finishMessage("error", "No Anchor API key set"); return; }
      runAnchorWebTask(apiKey, task, anchorSessionRef.current, onChunk)
        .then((result) => {
          // Update session for multi-step workflows
          if (result.sessionId) {
            anchorSessionRef.current = result.sessionId;
          }
          if (result.error) {
            finishMessage("error", result.error);
          } else {
            finishMessage("done");
          }
        })
        .catch((err) => finishMessage("error", err.message));
      return;
    }

    if (provider === "gemini") {
      if (!apiKey) { finishMessage("error", "No Gemini API key set"); return; }
      const controller = new AbortController();
      streamGemini(apiKey, s.model, s.systemPrompt, history, task, s.temperature, onChunk, controller.signal)
        .then(() => finishMessage("done"))
        .catch((err) => { if (err.name !== "AbortError") finishMessage("error", err.message); });
      return;
    }

    if (!apiKey) { finishMessage("error", `No ${provider} API key set`); return; }

    const endpoint = provider === "groq"
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";

    const apiMessages: { role: string; content: string }[] = [];
    if (s.systemPrompt.trim()) apiMessages.push({ role: "system", content: s.systemPrompt });
    for (const msg of history) {
      if (msg.status === "done") apiMessages.push({ role: msg.role, content: msg.content });
    }
    apiMessages.push({ role: "user", content: task });

    const controller = new AbortController();
    streamOpenAICompat(endpoint, apiKey, s.model, apiMessages, s.temperature, onChunk, controller.signal)
      .then(() => finishMessage("done"))
      .catch((err) => { if (err.name !== "AbortError") finishMessage("error", err.message); });
  }, []);

  const clearThread = useCallback(() => {
    setMessages([]);
    anchorSessionRef.current = null; // Reset session on clear
  }, []);

  return { messages, settings, updateSetting, sendTask, clearThread, keyStatus, checkKey, checkAllKeys };
}
