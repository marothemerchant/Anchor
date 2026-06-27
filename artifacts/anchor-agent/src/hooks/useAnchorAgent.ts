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

const PROXY_BASE = "/api";

async function createAnchorSession(): Promise<{ sessionId: string; liveViewUrl: string } | null> {
  const res = await fetch(`${PROXY_BASE}/anchor/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `session create failed: ${res.status}`);
  }
  const data = await res.json() as { sessionId?: string; liveViewUrl?: string };
  const { sessionId, liveViewUrl } = data;
  if (!sessionId || !liveViewUrl) throw new Error("no sessionId/liveViewUrl in response");
  return { sessionId, liveViewUrl };
}

async function runAnchorTask(
  task: string,
  sessionId: string | null,
  onChunk: (text: string) => void
): Promise<void> {
  const response = await fetch(`${PROXY_BASE}/anchor/task`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, sessionId }),
  });
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);

  const data = await response.json() as Record<string, unknown>;
  const raw =
    (data as { data?: { result?: { result?: unknown; [k: string]: unknown } } }).data?.result?.result ??
    (data as { data?: { result?: unknown } }).data?.result ??
    (data as { result?: unknown }).result ??
    data;
  const result = typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);

  for (const char of result) {
    onChunk(char);
    await new Promise((r) => setTimeout(r, 3));
  }
}

async function closeAnchorSession(sessionId: string): Promise<void> {
  await fetch(`${PROXY_BASE}/anchor/sessions/${sessionId}`, {
    method: "DELETE",
  }).catch(() => { /* best-effort */ });
}

export async function validateKey(provider: Provider, key: string): Promise<boolean> {
  if (!key.trim()) return false;
  try {
    if (provider === "openai") {
      const r = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` } });
      return r.status !== 401 && r.status !== 403;
    }
    if (provider === "gemini") {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      return r.ok;
    }
    if (provider === "groq") {
      const r = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${key}` } });
      return r.status !== 401 && r.status !== 403;
    }
    if (provider === "anchor") {
      const r = await fetch("https://api.anchorbrowser.io/v1/sessions", {
        method: "GET",
        headers: { "anchor-api-key": key },
      });
      return r.status !== 401 && r.status !== 403;
    }
  } catch {
    return true; // CORS network error — assume valid, will surface on first use
  }
  return false;
}

export function useAnchorAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);

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
  const liveSessionIdRef = useRef(liveSessionId);
  liveSessionIdRef.current = liveSessionId;

  const updateSetting = useCallback(<K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const checkKey = useCallback(async (provider: Provider) => {
    const s = settingsRef.current;
    const key =
      provider === "openai" ? s.openaiKey
      : provider === "gemini" ? s.geminiKey
      : provider === "groq" ? s.groqKey
      : s.anchorKey;
    if (!key.trim()) { setKeyStatus((prev) => ({ ...prev, [provider]: "idle" })); return; }
    setKeyStatus((prev) => ({ ...prev, [provider]: "checking" }));
    const ok = await validateKey(provider, key);
    setKeyStatus((prev) => ({ ...prev, [provider]: ok ? "ok" : "error" }));
  }, []);

  const checkAllKeys = useCallback(async () => {
    await Promise.all((["openai", "gemini", "groq", "anchor"] as Provider[]).map((p) => checkKey(p)));
  }, [checkKey]);

  const closeLiveView = useCallback(() => {
    const sid = liveSessionIdRef.current;
    const s = settingsRef.current;
    if (sid) closeAnchorSession(sid);
    setLiveViewUrl(null);
    setLiveSessionId(null);
  }, []);

  const sendTask = useCallback((task: string) => {
    if (!task.trim()) return;

    const s = settingsRef.current;
    const history = messagesRef.current;
    const provider = getProvider(s.model);
    const apiKey = getActiveKey(s);
    const assistantMsgId = crypto.randomUUID();
    const startTime = Date.now();

    const newUserMsg: Message = {
      id: crypto.randomUUID(), role: "user", content: task,
      timestamp: new Date(), status: "done",
    };
    const newAssistantMsg: Message = {
      id: assistantMsgId, role: "assistant", content: "",
      timestamp: new Date(), status: "streaming",
    };

    setMessages((prev) => [...prev, newUserMsg, newAssistantMsg]);

    const onChunk = (text: string) =>
      setMessages((prev) =>
        prev.map((msg) => msg.id === assistantMsgId ? { ...msg, content: msg.content + text } : msg)
      );

    const finishMessage = (status: "done" | "error", errorMsg?: string) => {
      const elapsed = (Date.now() - startTime) / 1000;
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== assistantMsgId) return msg;
          return {
            ...msg, status, elapsed,
            content: errorMsg
              ? (msg.content ? msg.content + "\n\n" : "") + `error: ${errorMsg}`
              : msg.content,
          };
        })
      );
    };

    if (provider === "anchor") {
      if (!apiKey) { finishMessage("error", "No Anchor API key set"); return; }

      (async () => {
        try {
          // 1. Create a live session
          onChunk("initializing browser session...\n");
          const session = await createAnchorSession();

          if (session) {
            onChunk(`session: ${session.sessionId.slice(0, 8)}...\n`);
            onChunk("opening live view...\n\n");
            setLiveViewUrl(session.liveViewUrl);
            setLiveSessionId(session.sessionId);

            // 2. Run the task inside that session
            await runAnchorTask(task, session.sessionId, onChunk);
          } else {
            // Fallback: run without live view
            onChunk("(live view unavailable — running headless)\n\n");
            await runAnchorTask(task, null, onChunk);
          }

          finishMessage("done");
        } catch (err: unknown) {
          finishMessage("error", err instanceof Error ? err.message : String(err));
        }
      })();
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

  const clearThread = useCallback(() => setMessages([]), []);

  return {
    messages, settings, updateSetting, sendTask, clearThread,
    keyStatus, checkKey, checkAllKeys,
    liveViewUrl, liveSessionId, closeLiveView,
  };
}
