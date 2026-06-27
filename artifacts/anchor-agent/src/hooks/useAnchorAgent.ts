import { useState, useRef, useCallback, useEffect } from "react";

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
  apiKey: string;
  baseUrl: string;
  systemPrompt: string;
  temperature: number;
  model: string;
}

const generateSimulatedResponse = (task: string): string => {
  const lowerTask = task.toLowerCase();
  if (lowerTask.includes("summarize") || lowerTask.includes("summary")) {
    return `- Key points extracted from context.\n- Found 3 major themes regarding process optimization.\n- Action items identified and formatted.\n\nSummary complete.`;
  }
  if (lowerTask.includes("code") || lowerTask.includes("script") || lowerTask.includes("function")) {
    return `Here is the requested implementation:\n\n\`\`\`javascript\nfunction executeTask() {\n  console.log("Running optimized protocol...");\n  return true;\n}\n\`\`\`\n\nTested and ready.`;
  }
  if (lowerTask.includes("ping") || lowerTask.includes("hello") || lowerTask.includes("test")) {
    return `PONG. System online and awaiting commands.`;
  }
  
  return `Acknowledged task: "${task}". \nProcessing parameters... \nExecuting default protocol. \nResult: Task completed successfully within nominal parameters.`;
};

export function useAnchorAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings, setSettings] = useState<AgentSettings>({
    apiKey: "",
    baseUrl: "",
    systemPrompt: "You are ANCHOR AGENT, a precise terminal AI.",
    temperature: 0.7,
    model: "claude-opus-4-5",
  });

  const updateSetting = <K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const sendTask = useCallback((task: string) => {
    if (!task.trim()) return;

    const userMsgId = crypto.randomUUID();
    const assistantMsgId = crypto.randomUUID();
    const startTime = Date.now();

    const newUserMsg: Message = {
      id: userMsgId,
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

    const simulatedResponse = generateSimulatedResponse(task);
    let charIndex = 0;
    
    // Simulate streaming
    const interval = setInterval(() => {
      if (charIndex < simulatedResponse.length) {
        const nextChar = simulatedResponse[charIndex];
        setMessages((prev) => 
          prev.map((msg) => {
            if (msg.id === assistantMsgId) {
              return { ...msg, content: msg.content + nextChar };
            }
            return msg;
          })
        );
        charIndex++;
      } else {
        clearInterval(interval);
        const elapsed = (Date.now() - startTime) / 1000;
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === assistantMsgId) {
              return { ...msg, status: "done", elapsed };
            }
            return msg;
          })
        );
      }
    }, 15);
  }, []);

  const clearThread = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    settings,
    updateSetting,
    sendTask,
    clearThread,
  };
}
