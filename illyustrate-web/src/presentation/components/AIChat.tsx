import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, AlertCircle } from 'lucide-react'
import type { Repository } from '@domain/entities/Repository'
import type { ChatMessage } from '@shared/types'
import { AIService } from '@infrastructure/ai/AIService'

interface AIChatProps {
  repository: Repository
}

// Initialize AI service with environment configuration
const getAIService = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (import.meta as any).env
  const provider = (env?.VITE_AI_PROVIDER || 'gemini').toLowerCase()
  const apiKey = env?.VITE_AI_API_KEY
  const model = env?.VITE_AI_MODEL
  
  if (!apiKey || apiKey === 'your-ai-api-key-here') {
    return null
  }
  
  // Validate provider
  const validProviders = ['gemini', 'groq', 'openai']
  if (!validProviders.includes(provider)) {
    console.error(`Invalid AI provider: ${provider}. Must be one of: ${validProviders.join(', ')}`)
    return null
  }
  
  return new AIService({
    provider: provider as 'gemini' | 'groq' | 'openai',
    apiKey,
    model,
  })
}

export function AIChat({ repository }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: getAIService() 
        ? `Hello! I'm your AI assistant for **${repository.displayName}**. I can help you understand the codebase, explain functions, find dependencies, and answer any questions about the code. What would you like to know?`
        : `Hello! I'm your AI assistant for **${repository.displayName}**. ⚠️ Note: AI service is not configured. Please add your API key to the .env file to enable AI chat.`,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const aiService = getAIService()
      
      if (!aiService) {
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: '⚠️ AI service is not configured. Please add your API key to the .env file (VITE_AI_API_KEY).',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, aiMessage])
        setIsLoading(false)
        return
      }

      // Get AI response using the actual service
      const response = await aiService.chat({
        messages: [...messages, userMessage],
        context: {
          repositoryName: repository.fullName,
        },
      })

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      console.error('AI chat error:', error)
      const errorMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to get AI response. Please check your API key and try again.'}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
    }).format(date)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-4 ${
              message.role === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === 'user'
                  ? 'bg-indigo-600'
                  : 'bg-emerald-600'
              }`}
            >
              {message.role === 'user' ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-white" />
              )}
            </div>
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-200'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">
                {message.content.split('**').map((part, i) =>
                  i % 2 === 0 ? part : <strong key={i} className="font-semibold">{part}</strong>
                )}
              </div>
              <div
                className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-indigo-200' : 'text-slate-500'
                }`}
              >
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-slate-800 rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
              <span className="text-sm text-slate-400">Thinking...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your codebase..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
