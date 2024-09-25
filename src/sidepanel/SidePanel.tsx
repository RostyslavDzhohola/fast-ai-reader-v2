import React, { useState, useRef, useEffect } from 'react'
import './SidePanel.css'
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

export const SidePanel: React.FC = () => {
  const [streamedText, setStreamedText] = useState<string>('')
  const [prompt, setPrompt] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [streamedText])

  const handleStreamText = async () => {
    if (!prompt.trim()) return // Don't stream if prompt is empty

    console.log('Stream text clicked')
    setStreamedText((prevText) => prevText + '\n\nYou: ' + prompt + '\n\nAI: ')
    setPrompt('')
    setIsStreaming(true)

    try {
      const { textStream } = await streamText({
        model: openai('gpt-4o-mini'),
        prompt: prompt,
      })

      for await (const chunk of textStream) {
        setStreamedText((prevText) => prevText + chunk)
      }
    } catch (error) {
      console.error('Error streaming text:', error)
      setStreamedText((prevText) => prevText + 'An error occurred while streaming text.')
    } finally {
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isStreaming) {
      handleStreamText()
    }
  }

  return (
    <main className="side-panel">
      <div className="chat-container">
        <div className="output-text" ref={outputRef}>
          {streamedText || 'AI response will appear here...'}
        </div>
      </div>
      <div className="input-container">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter your prompt here"
          className="prompt-input"
          disabled={isStreaming}
        />
        <button
          onClick={handleStreamText}
          disabled={isStreaming || !prompt.trim()}
          className="stream-button"
        >
          {isStreaming ? 'Streaming...' : 'Ask AI'}
        </button>
      </div>
    </main>
  )
}

export default SidePanel
