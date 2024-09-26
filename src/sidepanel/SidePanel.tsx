import React, { useState, useRef, useEffect } from 'react'
import './SidePanel.css'
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

// Define a type for our chat messages
type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export const SidePanel: React.FC = () => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [prompt, setPrompt] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const outputRef = useRef<HTMLDivElement>(null)

  // Load chat history when component mounts
  useEffect(() => {
    loadChatHistory()
  }, [])

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [chatHistory])

  const loadChatHistory = () => {
    chrome.storage.local.get(['chatHistory'], (result) => {
      if (result.chatHistory) {
        setChatHistory(result.chatHistory)
      }
    })
  }

  const handleStreamText = async () => {
    if (!prompt.trim()) return

    const userMessage: ChatMessage = { role: 'user', content: prompt }
    const newHistory = [...chatHistory, userMessage]
    setChatHistory(newHistory)
    setPrompt('')
    setIsStreaming(true)

    try {
      const { textStream } = await streamText({
        model: openai('gpt-4o-mini'),
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant with a goal to help the user with discord research. You will be provided instructions from the user and you will get text of the discord messages that you will need to process and provide the user with the information they are looking for.',
          },
          ...newHistory.map((msg) => ({ role: msg.role, content: msg.content })),
        ],
      })

      let assistantResponse = ''
      for await (const chunk of textStream) {
        assistantResponse += chunk
        setChatHistory((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: assistantResponse },
        ])
      }

      const updatedHistory: ChatMessage[] = [
        ...newHistory,
        { role: 'assistant' as const, content: assistantResponse },
      ]
      setChatHistory(updatedHistory)
      chrome.storage.local.set({ chatHistory: updatedHistory })
    } catch (error) {
      console.error('Error streaming text:', error)
      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', content: 'An error occurred while streaming text.' },
      ])
    } finally {
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isStreaming) {
      handleStreamText()
    }
  }

  const handleResetChat = () => {
    setChatHistory([])
    chrome.storage.local.remove(['chatHistory'], () => {
      console.log('Chat history cleared')
    })
  }

  return (
    <main className="side-panel">
      <div className="chat-container">
        <div className="messages" ref={outputRef}>
          {chatHistory.length > 0 ? (
            chatHistory.map((message, index) => (
              <div key={index} className={`message ${message.role}`}>
                <div className="message-content">
                  <p>{message.content}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-chat">AI response will appear here...</div>
          )}
        </div>
      </div>
      <div className="input-container">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message here..."
          className="prompt-input"
          disabled={isStreaming}
        />
        <button
          onClick={handleStreamText}
          disabled={isStreaming || !prompt.trim()}
          className="stream-button"
        >
          {isStreaming ? 'Sending...' : 'Send'}
        </button>
        <button onClick={handleResetChat} className="reset-button">
          Clear Chat
        </button>
      </div>
    </main>
  )
}

export default SidePanel
