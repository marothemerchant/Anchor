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

export interface AgentSettings {
  openaiKey: string;
  geminiKey: string;
  groqKey: string;
  systemPrompt: string;
  temperature: number;
  model: string;
}

export type Provider = "openai" | "gemini" | "groq";

export function getProvider(model: string): Provider {
  if (model.startsWith("gpt-")) return "openai";
  if (model.startsWith("gemini-")) return "gemini";
  return "groq";
}

export function getActiveKey(settings: AgentSettings): string {
  const p = getProvider(settings.model);
  if (p === "openai") return settings.openaiKey;
  if (p === "gemini") return settings.geminiKey;
  return settings.groqKey;
}

const generateSimulatedResponse = (task: string): string => {
  const t = task.toLowerCase();
  if (t.includes("summarize") || t.includes("summary")) {
    return `- Key points extracted from context.\n- Found 3 major themes regarding process optimization.\n- Action items identified and formatted.\n\nSummary complete. [simulated]`;
  }
  if (t.includes("code") || t.includes("script") || t.includes("function")) {
    return `Here is the requested implementation:\n\`\`\`javascript\nfunction executeTask() {\n  console.log("Running optimized protocol...");\n  return true;\n}\n\`\`\`\nTested and ready. [simulated]`;
  }
  if (t.includes("ping") || t.includes("hello") || t.includes("test")) {
    return `PONG. System online and awaiting commands. [simulated]`;
  }
  return `Acknowledged task: "${task}".\nProcessing parameters...\nExecuting default protocol.\nResult: Task completed successfully within nominal parameters. [simulated]`;
};

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
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature, stream: true }),
    signal,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`${response.status}: ${err}`);
  }

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
      } catch {
        // ignore malformed SSE chunks
      }
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
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    });
  }
  contents.push({ role: "user", parts: [{ text: userTask }] });

  const body: Record<string, unknown> = {
    contents,
    generationConfig: { temperature },
  };
  if (systemPrompt.trim()) {
    body.system_instruction = { parts: [{ text: systemPrompt }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`${response.status}: ${err}`);
  }

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
      } catch {
        // ignore malformed SSE chunks
      }
    }
  }
}

export function useAnchorAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings, setSettings] = useState<AgentSettings>({
    openaiKey: "",
    geminiKey: "",
    groqKey: "",
    systemPrompt: "You are ANCHOR AGENT, a precise terminal AI. Be concise and direct.",
    temperature: 0.7,
    model: "gpt-4o",
  });

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const updateSetting = useCallback(<K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
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

    if (!apiKey) {
      const simulated = generateSimulatedResponse(task);
      let charIndex = 0;
      const interval = setInterval(() => {
        if (charIndex < simulated.length) {
          onChunk(simulated[charIndex]);
          charIndex++;
        } else {
          clearInterval(interval);
          finishMessage("done");
        }
      }, 15);
      return;
    }

    const controller = new AbortController();

    if (provider === "gemini") {
      streamGemini(
        apiKey,
        s.model,
        s.systemPrompt,
        history,
        task,
        s.temperature,
        onChunk,
        controller.signal
      )
        .then(() => finishMessage("done"))
        .catch((err) => {
          if (err.name !== "AbortError") finishMessage("error", err.message);
        });
      return;
    }

    const endpoint =
      provider === "groq"
        ? "https://api.groq.com/openai/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";

    const apiMessages: { role: string; content: string }[] = [];
    if (s.systemPrompt.trim()) {
      apiMessages.push({ role: "system", content: s.systemPrompt });
    }
    for (const msg of history) {
      if (msg.status === "done") {
        apiMessages.push({ role: msg.role, content: msg.content });
      }
    }
    apiMessages.push({ role: "user", content: task });

    streamOpenAICompat(endpoint, apiKey, s.model, apiMessages, s.temperature, onChunk, controller.signal)
      .then(() => finishMessage("done"))
      .catch((err) => {
        if (err.name !== "AbortError") finishMessage("error", err.message);
      });
  }, []);

  const clearThread = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, settings, updateSetting, sendTask, clearThread, getProvider, getActiveKey };
}
