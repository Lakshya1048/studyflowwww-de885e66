import { useState, useRef, useCallback } from 'react';
import { Send, Trash2, Bot, User, Loader2, Paperclip, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ReactMarkdown from 'react-markdown';
import { useToast } from '@/hooks/use-toast';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/doubt-solver`;
const ACCEPTED = 'image/png,image/jpeg,image/webp,image/gif,application/pdf';

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
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const oversized = files.filter((f) => f.size > MAX_FILE_BYTES);
    if (oversized.length) {
      toast({ title: 'File too large', description: `Max 10 MB. "${oversized[0].name}" is too big.`, variant: 'destructive' });
      e.target.value = '';
      return;
    }

    const newAttachments: Attachment[] = await Promise.all(
      files.map(async (file) => {
        const base64 = await fileToBase64(file);
        return {
          name: file.name,
          mimeType: file.type,
          base64,
          preview: file.type.startsWith('image/') ? `data:${file.type};base64,${base64}` : undefined,
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

    // Abort any previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let assistantSoFar = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: updatedMessages
            .filter((m) => !(m.role === 'assistant' && m.content.startsWith('❌')))
            .map((m) => ({
              role: m.role,
              content: m.content,
              attachments: m.attachments?.map((a) => ({ name: a.name, mimeType: a.mimeType, base64: a.base64 })),
            })),
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({ error: 'Request failed' }));
        const errMsg = errBody.error || `Error ${resp.status}`;
        toast({ title: 'AI Error', description: errMsg, variant: 'destructive' });
        setMessages((prev) => [...prev, { role: 'assistant', content: `❌ ${errMsg}` }]);
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      const upsertAssistant = (content: string) => {
        assistantSoFar += content;
        const snapshot = assistantSoFar;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: snapshot } : m));
          }
          return [...prev, { role: 'assistant', content: snapshot }];
        });
        scrollToBottom();
      };

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
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;

      const errorMsg = e instanceof TypeError && e.message.includes('fetch')
        ? 'Network error. Check your internet connection.'
        : e instanceof Error ? e.message : 'Something went wrong';

      setMessages((prev) => [...prev, { role: 'assistant', content: `❌ ${errorMsg}` }]);
      toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
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

  const suggestions = ['What is the derivative of sin(x)?', 'Balance: Fe + O₂ → Fe₂O₃', 'Explain electromagnetic induction'];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-3rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">AI Doubt Solver</h2>
          <p className="text-sm text-muted-foreground">Ask your doubts</p>
        </div>
        {messages.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => { setMessages([]); abortRef.current?.abort(); }} className="gap-1.5">
            <Trash2 className="w-4 h-4" /> Clear
          </Button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Ask your doubts</p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {suggestions.map((q) => (
                <button key={q} onClick={() => setInput(q)} className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-muted transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
            <div className={`${msg.role === 'user' ? 'max-w-[80%]' : 'max-w-[90%] flex-1 min-w-0'} space-y-2`}>
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
                <div className={`rounded-xl text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground px-4 py-3' : 'bg-card border border-border card-shadow px-5 py-4'}`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-2 [&>p]:leading-relaxed [&>ul]:my-2 [&>ol]:my-2 [&>pre]:bg-muted [&>pre]:rounded-lg [&>pre]:p-3 [&>pre]:my-3 [&>pre]:overflow-x-auto [&>pre]:text-xs [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_strong]:font-semibold [&_strong]:text-foreground">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-4 h-4 text-secondary-foreground" />
              </div>
            )}
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="bg-card border border-border card-shadow rounded-xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Pending attachments */}
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
              <button onClick={() => removeAttachment(i)} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-background/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-3 h-3 text-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 items-end">
        <input ref={fileInputRef} type="file" accept={ACCEPTED} multiple className="hidden" onChange={handleFileSelect} />
        <button onClick={() => fileInputRef.current?.click()} disabled={isLoading} title="Attach image or PDF" className="flex-shrink-0 p-2.5 rounded-lg border border-input text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50">
          <Paperclip className="w-4 h-4" />
        </button>
        <Textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type your doubt… (Shift+Enter for new line)" rows={2} className="resize-none flex-1" disabled={isLoading} />
        <Button onClick={sendMessage} disabled={isLoading || (!input.trim() && attachments.length === 0)} className="h-auto py-3">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default DoubtSolver;
