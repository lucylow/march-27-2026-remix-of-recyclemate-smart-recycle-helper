import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Loader2, Sparkles, MessageSquarePlus, ImagePlus, X, Wrench } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useUser } from "@/context/UserContext";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string; image?: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const AGENT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/featherless-agent`;

const SUGGESTIONS = [
  "Can pizza boxes be recycled?",
  "How do I dispose of batteries safely?",
  "What plastics are actually recyclable?",
  "Tips for reducing household waste",
  "Analyze my recycling habits",
  "What's my environmental impact so far?",
];

const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

const ChatPage = () => {
  const { scanHistory, points, streak } = useUser();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [agentMode, setAgentMode] = useState(true); // Tool-calling agent mode
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image too large. Maximum 4MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendMessage = async (text: string) => {
    if ((!text.trim() && !pendingImage) || isLoading) return;
    const userMsg: Msg = {
      role: "user",
      content: text.trim() || (pendingImage ? "What's in this image? How should I recycle these items?" : ""),
      image: pendingImage || undefined,
    };
    const currentImage = pendingImage;
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setPendingImage(null);
    setIsLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    const recentScans = scanHistory
      .slice(0, 10)
      .flatMap((r) => r.items.map((i) => i.displayName));

    try {
      // Agent mode: tool-calling (non-streaming, but smarter)
      if (agentMode && !currentImage) {
        const resp = await fetch(AGENT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
            userContext: {
              points,
              streak,
              recentScans,
              totalScans: scanHistory.length,
            },
          }),
        });

        if (!resp.ok) {
          const errorData = await resp.json().catch(() => ({}));
          if (resp.status === 429) toast.error("Rate limited — please wait a moment");
          else if (resp.status === 402) toast.error("AI credits exhausted");
          throw new Error(errorData.error || "Agent request failed");
        }

        const data = await resp.json();
        upsertAssistant(data.text || "I wasn't able to process that. Please try again.");
      } else {
        // Streaming chat mode (with optional image)
        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
            userContext: {
              points,
              streak,
              recentScans,
              totalScans: scanHistory.length,
            },
            ...(currentImage ? { image: currentImage } : {}),
          }),
        });

        if (!resp.ok || !resp.body) {
          const errorData = await resp.json().catch(() => ({}));
          if (resp.status === 429) toast.error("Rate limited — please wait a moment");
          else if (resp.status === 402) toast.error("AI credits exhausted");
          throw new Error(errorData.error || "Failed to connect to AI");
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let streamDone = false;

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") { streamDone = true; break; }
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) upsertAssistant(content);
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        if (textBuffer.trim()) {
          for (let raw of textBuffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (raw.startsWith(":") || raw.trim() === "") continue;
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) upsertAssistant(content);
            } catch { /* ignore */ }
          }
        }
      }
    } catch (e) {
      console.error("Chat error:", e);
      upsertAssistant("Sorry, I couldn't connect to the AI service. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    setPendingImage(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden -mx-2 sm:-mx-6 -mt-2">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-display mb-1">AI Assistant</h1>
          <p className="text-sm text-muted-foreground">
            {scanHistory.length > 0
              ? `Personalized with ${scanHistory.length} scan${scanHistory.length > 1 ? "s" : ""}`
              : "Ask anything about recycling & sustainability"}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleNewChat}
            className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center active-press"
            title="New chat"
          >
            <MessageSquarePlus className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-6 space-y-3 sm:space-y-4 pb-3 sm:pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-[260px]">
              {scanHistory.length > 0
                ? `I know your recycling history! Ask me for personalized advice based on your ${scanHistory.length} scans.`
                : "Hi! I'm your AI recycling assistant. Ask me anything or send a photo for instant analysis."}
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {SUGGESTIONS.slice(0, scanHistory.length > 0 ? 6 : 4).map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="px-3 py-2 rounded-xl bg-secondary text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-foreground text-background rounded-br-lg"
                    : "bg-card border border-border rounded-bl-lg"
                }`}
              >
                {/* Image thumbnail in user message */}
                {msg.image && (
                  <div className="mb-2 rounded-xl overflow-hidden border border-border/30">
                    <img
                      src={msg.image}
                      alt="Attached"
                      className="w-full max-h-40 object-cover"
                    />
                  </div>
                )}
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-2 [&>ol]:mb-2">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-bl-lg px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Pending image preview */}
      <AnimatePresence>
        {pendingImage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-6 overflow-hidden"
          >
            <div className="relative inline-block mb-2">
              <img
                src={pendingImage}
                alt="Pending attachment"
                className="h-20 rounded-xl border border-border object-cover"
              />
              <button
                onClick={() => setPendingImage(null)}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-border bg-background">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-2"
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center shrink-0 disabled:opacity-40 active-press hover:bg-secondary/80 transition-colors"
            title="Attach image"
          >
            <ImagePlus className="w-5 h-5 text-muted-foreground" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={pendingImage ? "Describe what you see..." : "Ask about recycling..."}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-2xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={(!input.trim() && !pendingImage) || isLoading}
            className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 active-press"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;
