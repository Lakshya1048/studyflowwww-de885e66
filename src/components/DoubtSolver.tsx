import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Trash2, Bot, User, Loader2, Paperclip, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ReactMarkdown from 'react-markdown';
import { useToast } from '@/hooks/use-toast';

// 10 MB limit per file — keeps edge function safely under memory limits
const MAX_FILE_BYTES = 10 * 1024 * 1024;

type Attachment = {
  name: string;
  mimeType: string;
  base64: string;
  preview?: string;
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/doubt-solver`;
const ACCEPTED = 'image/png,image/jpeg,image/webp,image/gif,application/pdf';

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res((reader.result as string).split(',')[1]);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });

const DoubtSolver = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const oversized = files.filter((f) => f.size > MAX_FILE_BYTES);
    if (oversized.length > 0) {
      toast({
        title: 'File too large',
        description: `Max size is 10 MB per file. "${oversized[0].name}" is ${(oversized[0].size / 1024 / 1024).toFixed(1)} MB. For large PDFs, try taking a screenshot of the relevant page.`,
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }

    const newAttachments: Attachment[] = await Promise.all(
      files.map(async (file) => {
        const base64 = await fileToBase64(file);
        const isImage = file.type.startsWith('image/');
        return {
          name: file.name,
          mimeType: file.type,
          base64,
          preview: isImage ? `data:${file.type};base64,${base64}` : undefined,
        };
      })
    );

    setAttachments((prev) => [...prev, ...newAttachments].slice(0, 4));
    e.target.value = '';
  };

  const removeAttachment = (idx: number) => setAttachments((prev) => prev.filter((_, i) => i !== idx));

  const sendMessage = async () => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || isLoading) return;

    const userMsg: Message = {
      role: 'user',
      content: text,
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setAttachments([]);
    setIsLoading(true);
    scrollToBottom();

    let assistantSoFar = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments?.map((a) => ({
              name: a.name,
              mimeType: a.mimeType,
              base64: a.base64,
            })),
          })),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Failed to get response' }));
        if (resp.status === 429) {
          toast({ title: 'Too many requests', description: 'Please wait a moment and try again.', variant: 'destructive' });
        } else if (resp.status === 402) {
          toast({ title: 'Usage limit reached', description: 'AI usage limit reached. Please try again later.', variant: 'destructive' });
        } else if (resp.status === 546) {
          toast({ title: 'File too large for AI', description: 'The attached file is too large to process. Please use a smaller image or a shorter PDF (under 4 MB).', variant: 'destructive' });
        } else {
          throw new Error(err.error || 'Failed to get response');
        }
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
              scrollToBottom();
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Something went wrong';
      setMessages((prev) => [...prev, { role: 'assistant', content: `❌ Error: ${errorMsg}` }]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-3rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">AI Doubt Solver</h2>
          <p className="text-sm text-muted-foreground">Ask any PCM doubt — attach images or PDFs (max 4 MB)</p>
        </div>
        {messages.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => setMessages([])} className="gap-1.5">
            <Trash2 className="w-4 h-4" /> Clear
          </Button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Ask your doubt</p>
            <p className="text-xs mt-1">Type a question, or attach an image/PDF (max 10 MB) — or use camera 📷</p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {['What is the derivative of sin(x)?', 'Balance: Fe + O₂ → Fe₂O₃', 'Explain electromagnetic induction'].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-muted transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              <div className="max-w-[85%] space-y-2">
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.attachments.map((a, ai) => (
                      <div key={ai} className="rounded-lg overflow-hidden border border-border bg-card">
                        {a.preview ? (
                          <img src={a.preview} alt={a.name} className="max-h-40 max-w-xs object-cover" />
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-2">
                            <FileText className="w-4 h-4 text-primary" />
                            <span className="text-xs text-foreground truncate max-w-[160px]">{a.name}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {(msg.content || msg.role === 'assistant') && (
                  <div
                    className={`rounded-xl px-4 py-3 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border card-shadow'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 text-secondary-foreground" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="bg-card border border-border card-shadow rounded-xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Pending attachment previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((a, i) => (
            <div key={i} className="relative group rounded-lg border border-border bg-card overflow-hidden">
              {a.preview ? (
                <img src={a.preview} alt={a.name} className="h-16 w-16 object-cover" />
              ) : (
                <div className="h-16 w-32 flex items-center gap-2 px-3">
                  <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-xs text-foreground truncate">{a.name}</span>
                </div>
              )}
              <button
                onClick={() => removeAttachment(i)}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-background/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-2 items-end">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          capture="environment"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          title="Attach image or PDF (max 4 MB)"
          className="flex-shrink-0 p-2.5 rounded-lg border border-input text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your doubt… (Shift+Enter for new line)"
          rows={2}
          className="resize-none flex-1"
          disabled={isLoading}
        />

        <Button
          onClick={sendMessage}
          disabled={isLoading || (!input.trim() && attachments.length === 0)}
          className="h-auto py-3"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default DoubtSolver;
