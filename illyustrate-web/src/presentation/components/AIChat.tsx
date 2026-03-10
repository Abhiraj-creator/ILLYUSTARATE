import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import type { Repository } from '@domain/entities/Repository'
import type { ChatMessage } from '@shared/types'
import { AIService } from '@infrastructure/ai/AIService'
import { useAuthStore } from '@application/stores/AuthStore'

interface AIChatProps {
  repository: Repository
}

// Initialize AI service
const getAIService = () => {
  const env = (import.meta as any).env
  const provider = (env?.VITE_AI_PROVIDER || 'gemini').toLowerCase()
  const apiKeyString = env?.VITE_AI_API_KEY
  const model = env?.VITE_AI_MODEL

  if (!apiKeyString || apiKeyString === 'your-ai-api-key-here') return null

  const apiKeys = apiKeyString.split(',').map((key: string) => key.trim()).filter((key: string) => key.length > 0)
  if (apiKeys.length === 0) return null

  const validProviders = ['gemini', 'groq', 'openai']
  if (!validProviders.includes(provider)) return null

  return new AIService({
    provider: provider as 'gemini' | 'groq' | 'openai',
    apiKeys,
    model,
  })
}

function useTypewriter(text: string, speed: number = 15, isActive: boolean = true, onCharTyped?: () => void) {
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const indexRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isActive) {
      setDisplayedText(text)
      setIsComplete(true)
      return
    }

    setDisplayedText('')
    setIsComplete(false)
    indexRef.current = 0

    const typeNextChar = () => {
      if (indexRef.current < text.length) {
        const nextChar = text[indexRef.current]
        setDisplayedText(prev => prev + nextChar)
        indexRef.current++
        if (onCharTyped) onCharTyped()
        const delay = nextChar === ' ' ? speed : nextChar === '\n' ? speed * 3 : speed + Math.random() * 5
        timeoutRef.current = setTimeout(typeNextChar, delay)
      } else {
        setIsComplete(true)
      }
    }

    timeoutRef.current = setTimeout(typeNextChar, speed)
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [text, speed, isActive, onCharTyped])

  return { displayedText, isComplete }
}

export function AIChat({ repository }: AIChatProps) {
  const { user } = useAuthStore()

  // Use session storage to persist chat messages across tab switches
  const storageKey = `chat_history_${repository.id}`
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = sessionStorage.getItem(storageKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
      } catch (e) {
        console.error('Failed to parse chat history', e)
      }
    }
    return [{
      id: 'welcome',
      role: 'assistant',
      content: getAIService()
        ? `Hello! I'm your AI assistant for **${repository.displayName || repository.name}**. I can help you understand the codebase, explain functions, find dependencies, and answer any questions about the code. What would you like to know?`
        : `Hello! I'm your AI assistant for **${repository.displayName || repository.name}**. ⚠️ Note: AI service is not configured. Please add your API key to the .env file to enable AI chat.`,
      timestamp: new Date(),
    }]
  })

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [cancelRequested, setCancelRequested] = useState(false)
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isGeneratingRef = useRef(false)

  const cancelCurrent = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setCancelRequested(true)
      setIsLoading(false)
      isGeneratingRef.current = false
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Save messages to session storage whenever they change
  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify(messages))
  }, [messages, storageKey])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])



  const handleSend = async () => {
    if (!input.trim() || isLoading || isGeneratingRef.current) return

    isGeneratingRef.current = true
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setCancelRequested(false)

    // Create new abort controller for this request
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const aiService = getAIService()
      if (!aiService) {
        const messageId = `ai-${Date.now()}`
        setMessages((prev) => [...prev, {
          id: messageId,
          role: 'assistant',
          content: '⚠️ AI service is not configured.',
          timestamp: new Date(),
        }])
        setTypingMessageId(messageId)
        setIsLoading(false)
        return
      }

      const response = await aiService.chat({
        messages: [...messages, userMessage],
        context: { repositoryName: repository.fullName },
        signal: controller.signal,
      })

      if (controller.signal.aborted) return

      const messageId = `ai-${Date.now()}`
      setMessages((prev) => [...prev, {
        id: messageId,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      }])
      setTypingMessageId(messageId)
    } catch (error: any) {
      if (axios.isCancel(error) || error.name === 'AbortError' || error.message === 'Request aborted') {
        console.log('AI request cancelled')
        return
      }
      console.error('AI chat error:', error)
      const messageId = `ai-${Date.now()}`
      setMessages((prev) => [...prev, {
        id: messageId,
        role: 'assistant',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to get AI response.'}`,
        timestamp: new Date(),
      }])
      setTypingMessageId(messageId)
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
        isGeneratingRef.current = false
        abortControllerRef.current = null
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric' }).format(date)
  }

  return (
    <div className="flex-1 flex flex-col bg-[#381932] relative overflow-hidden h-full rounded-2xl md:rounded-r-2xl border border-[#4a2040]/50 shadow-inner group-hover/parent:border-[#C084FC]/30 transition-colors">

      {/* Background Noise Effect */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCtI4caG91VxhEeqTu0gRCok9YwJzS-n1HSIde9plTKLUcE4aAOQF6sWo57gSiGsVz7XiwKelp83D6_aRrrc0a1hn6LHZdXM7bOGuCBIv79D4bk4weXiIkaHRl74MfxRm9VtribX7RDlN_SXjWpyLpPO-hUVgSGwkFKfJK4vqX8-_HN0h0_GMUAQVadJhw92hvvosK7pnucHzARe5z8nS-GgV6OIhvSE_5i8-ZglMFC6BJHtsZw_DY2GPQ6VYC-VEmYNS48jTIY-js")',
          backgroundBlendMode: 'overlay',
          backgroundRepeat: 'repeat'
        }}
      ></div>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto z-10 custom-scrollbar">
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-8">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isTyping={typingMessageId === message.id}
              onTypingComplete={() => setTypingMessageId(null)}
              formatTime={formatTime}
              user={user}
              onType={scrollToBottom}
            />
          ))}
          {isLoading && (
            <div className="flex items-start gap-4">
              <div className="size-10 rounded-full bg-gradient-to-tr from-[#7f13ec] to-[#C084FC] flex items-center justify-center shrink-0 opacity-80 shadow-md">
                <span className="material-symbols-outlined text-[#F5F5F7] text-xl">temp_preferences_custom</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[#F5F5F7]/50 text-xs font-bold uppercase tracking-widest">System Architect</span>
                </div>
                <div className="bg-[#4a2040]/60 backdrop-blur-md rounded-xl rounded-tl-none px-5 py-4 text-[#F5F5F7] border border-[#C084FC]/10 flex gap-4 items-center">
                  <div className="flex gap-1.5 items-center">
                    <div className="size-1.5 bg-[#C084FC]/60 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="size-1.5 bg-[#C084FC]/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="size-1.5 bg-[#C084FC]/60 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <button
                    onClick={cancelCurrent}
                    className="text-[10px] text-[#F5F5F7]/40 hover:text-red-400 font-bold uppercase tracking-widest flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Bottom Input Area */}
      <footer className="bg-[#191022]/80 backdrop-blur-lg border-t border-[#4a2040]/40 p-6 shrink-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div className="relative flex-1 group rounded-full transition-all duration-300 focus-within:shadow-[0_0_15px_rgba(192,132,252,0.3)]">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#F5F5F7]/30 group-focus-within:text-[#C084FC] transition-colors pointer-events-none">
              <span className="material-symbols-outlined">attach_file</span>
            </div>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="w-full h-14 bg-[#4a2040] pl-14 pr-14 rounded-full border border-[#C084FC]/10 text-[#F5F5F7] placeholder-[#F5F5F7]/30 focus:outline-none focus:border-[#C084FC]/40 transition-all font-medium disabled:opacity-50"
              placeholder="Ask about your codebase..."
              type="text"
            />
            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[#F5F5F7]/30 hover:text-[#C084FC] cursor-pointer transition-colors pt-1.5">
              <span className="material-symbols-outlined">mic</span>
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-14 w-14 rounded-full bg-gradient-to-br from-[#7f13ec] via-[#7f13ec] to-[#C084FC] flex items-center justify-center text-[#F5F5F7] shadow-lg shadow-[#C084FC]/10 hover:shadow-[#C084FC]/30 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-2xl">arrow_upward</span>
          </button>
          {isLoading && (
            <button
              onClick={cancelCurrent}
              title="Stop generating"
              className="h-14 px-6 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-xl">stop_circle</span>
              <span className="font-bold uppercase tracking-wider text-xs hidden sm:inline">Stop</span>
            </button>
          )}
        </div>
        <div className="max-w-4xl mx-auto mt-3 flex justify-center">
          <p className="text-[10px] text-[#F5F5F7]/20 font-bold uppercase tracking-widest hidden sm:block">ILLYUSTRATE ENGINE v4.2 // SECURE ARCHITECTURE</p>
        </div>
      </footer>
    </div>
  )
}

function MessageBubble({ message, isTyping, onTypingComplete, formatTime, user, onType }: any) {
  const { displayedText, isComplete } = useTypewriter(
    message.content,
    12,
    isTyping && message.role === 'assistant',
    onType
  )

  useEffect(() => {
    if (isComplete && isTyping && onTypingComplete) {
      onTypingComplete()
    }
  }, [isComplete, isTyping, onTypingComplete])

  const contentToShow = message.role === 'user' || !isTyping ? message.content : displayedText
  const showCursor = isTyping && !isComplete && message.role === 'assistant'

  if (message.role === 'user') {
    return (
      <div className="flex items-start gap-4 flex-row-reverse">
        <div className="size-10 rounded-full bg-[#4a2040] border border-[#C084FC]/20 flex items-center justify-center shrink-0 shadow-md overflow-hidden bg-cover bg-center" style={user?.avatarUrl ? { backgroundImage: `url('${user.avatarUrl}')` } : {}}>
          {!user?.avatarUrl && <span className="material-symbols-outlined text-[#C084FC] text-xl">person</span>}
        </div>
        <div className="flex flex-col gap-2 max-w-[85%] sm:max-w-2xl items-end">
          <div className="flex items-center gap-2">
            <span className="text-[#F5F5F7]/30 text-[10px] uppercase font-mono">{formatTime(message.timestamp)}</span>
            <span className="text-[#F5F5F7]/50 text-xs font-bold uppercase tracking-widest">{user?.name || 'Editor'}</span>
          </div>
          <div className="bg-[#C084FC]/10 backdrop-blur-sm rounded-xl rounded-tr-none p-4 sm:p-5 text-[#F5F5F7] leading-relaxed border border-[#C084FC]/30 shadow-inner text-sm whitespace-pre-wrap break-words">
            {contentToShow}
          </div>
        </div>
      </div>
    )
  }

  // AI Message
  return (
    <div className="flex items-start gap-4">
      <div className="size-10 rounded-full bg-gradient-to-tr from-[#7f13ec] to-[#C084FC] flex items-center justify-center shrink-0 shadow-lg">
        <span className="material-symbols-outlined text-[#F5F5F7] text-xl">temp_preferences_custom</span>
      </div>
      <div className="flex flex-col gap-2 max-w-[85%] sm:max-w-2xl">
        <div className="flex items-center gap-2">
          <span className="text-[#F5F5F7]/50 text-xs font-bold uppercase tracking-widest">System Architect</span>
          <span className="text-[#F5F5F7]/30 text-[10px] uppercase font-mono">{formatTime(message.timestamp)}</span>
        </div>
        <div className="bg-[#4a2040] rounded-xl rounded-tl-none p-4 sm:p-5 text-[#F5F5F7] leading-relaxed shadow-xl border border-[#C084FC]/10 text-sm whitespace-pre-wrap break-words min-h-[44px]">
          {contentToShow.split('**').map((part: string, i: number) => i % 2 === 0 ? part : <strong key={i} className="font-semibold text-[#C084FC]">{part}</strong>)}
          {showCursor && <span className="inline-block w-2 h-4 bg-[#C084FC] ml-1 animate-pulse align-middle" />}
        </div>
      </div>
    </div>
  )
}
