import React, { useState, useRef, useEffect } from 'react'
import './SidePanel.css'
import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

// TODO: Replace the API key with the fetch request to my API backend

// Define a type for our chat messages
type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  isExtracted?: boolean // New property to indicate extracted messages
}

// Add near the top, after imports
const logPrefix = '[SidePanel]'

export const SidePanel: React.FC = () => {
  console.log('Side panel component mounted')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [prompt, setPrompt] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const outputRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // New state for modal and message count
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [messageCount, setMessageCount] = useState<number>(10) // Default to 10 messages

  // New state for API key
  const [apiKey, setApiKey] = useState<string | undefined>(undefined)

  const openaiClient = createOpenAI({
    apiKey: apiKey,
  })

  // Load chat history and API key when component mounts
  useEffect(() => {
    console.log(`${logPrefix} Component mounting...`)
    loadChatHistory()

    // Notify background script that side panel is ready
    chrome.runtime.sendMessage({ action: 'sidePanelReady' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error notifying background script:', chrome.runtime.lastError)
      } else {
        console.log('Background script notified of side panel ready state')
      }
    })

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      console.log(`${logPrefix} Storage changed:`, changes)
      if (changes.openaiApiKey) {
        console.log(`${logPrefix} API key changed, reloading...`)
      }
    }

    const handleMessage = (message: any) => {
      console.log(`${logPrefix} Received message:`, message)
      if (message.action === 'reloadSidePanel') {
        console.log(`${logPrefix} Reloading side panel...`)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    chrome.runtime.onMessage.addListener(handleMessage)

    console.log(`${logPrefix} Component mounted successfully`)
    return () => {
      console.log(`${logPrefix} Component unmounting...`)
      chrome.storage.onChanged.removeListener(handleStorageChange)
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])

  useEffect(() => {
    // Handle scroll for output
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }

    // Handle scroll for chat container
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
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
    console.log(`${logPrefix} Starting text stream...`)
    if (!prompt.trim()) {
      console.log(`${logPrefix} Empty prompt, aborting stream`)
      return
    }

    if (!apiKey) {
      console.warn(`${logPrefix} API key missing, cannot proceed with stream`)
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Error: API key is missing. Please set your OpenAI API key in the options page.',
        },
      ])
      return
    }

    console.log(`${logPrefix} Streaming with prompt:`, prompt)
    const userMessage: ChatMessage = { role: 'user', content: prompt }
    const newHistory = [...chatHistory, userMessage]
    setChatHistory(newHistory)
    setPrompt('')
    setIsStreaming(true)

    // TODO: move this to the backend
    try {
      console.log(`${logPrefix} Initiating stream with OpenAI...`)
      const { textStream } = await streamText({
        model: openaiClient('gpt-4o-mini'),
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant with a goal to help the user with discord research. You will be provided instructions from the user and you will get text of the discord messages that you will need to process and provide the user with the information they are looking for.',
          },
          ...newHistory.map((msg) => ({ role: msg.role, content: msg.content })),
        ],
        onFinish({ usage }) {
          console.log('Usage of the onFinish:', usage)
        },
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
      console.error(`${logPrefix} Stream error:`, error)
      const errorDetails = {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        details: JSON.stringify(error, null, 2),
      }

      console.error(`${logPrefix} Detailed error:`, errorDetails)
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'An error occurred while streaming text. Please check the console for more details.',
        },
      ])
    } finally {
      setIsStreaming(false)
    }
  }

  const handleOpenOptions = () => {
    const optionsUrl = chrome.runtime.getURL('options.html')
    window.open(optionsUrl, '_blank')

    // Send a message to the background script to set a flag
    chrome.runtime.sendMessage({ action: 'setApiKeyAdditionFlag' })
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

  const handleResearchClick = () => {
    if (!apiKey) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Error: API key is missing. Please set your OpenAI API key in the options page.',
        },
      ])
      return
    }
    setIsModalOpen(true)
  }

  const handleModalSubmit = () => {
    console.log(`Requesting to extract ${messageCount} messages`)

    // Send a message to the background script
    chrome.runtime.sendMessage({ action: 'extractMessages', count: messageCount }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError)
        // Display an error message to the user
        setChatHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'An error occurred while extracting messages. Please try again.',
          },
        ])
        return
      }

      console.log('Received response from background script:', response)

      if (response && response.messages && response.messages.length > 0) {
        // Process the received messages
        processReceivedMessages(response.messages)
      } else if (response && response.error) {
        console.error('Error extracting messages:', response.error, response.details)
        // Display an error message to the user
        setChatHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `An error occurred while extracting messages: ${response.error}`,
          },
        ])
      } else {
        console.error('No messages received in the response')
        // Display an error message to the user
        setChatHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              'No messages were extracted. The chat might be empty or there might be an issue with message extraction.',
          },
        ])
      }
    })

    // Close the modal
    setIsModalOpen(false)
  }

  // Function to process received messages
  const processReceivedMessages = (messages: string[]) => {
    console.log(`${logPrefix} Processing ${messages.length} messages`)
    console.log(`${logPrefix} First message preview:`, messages[0]?.substring(0, 100))
    console.log(
      `${logPrefix} Last message preview:`,
      messages[messages.length - 1]?.substring(0, 100),
    )

    // Combine messages into a single string
    const messagesText = messages.join('')
    console.log('Combined messages text:', messagesText)

    // Create a system message for the AI
    const systemMessage: ChatMessage = {
      role: 'user',
      content: `I have extracted ${messages.length} messages from a Discord chat. Please analyze these messages and be ready to answer questions about them. Here are the messages:\n\n${messagesText}`,
      isExtracted: true, // Mark this as an extracted message
    }

    console.log('Created system message:', systemMessage)

    // Add the system message to the chat history
    setChatHistory((prevHistory) => {
      console.log('Updating chat history with system message')
      return [...prevHistory, systemMessage]
    })

    // Create an AI response message
    const aiResponse: ChatMessage = {
      role: 'assistant',
      content: `I've received and processed ${messages.length} Discord messages. What questions do you have about this conversation?`,
    }

    console.log('Created AI response:', aiResponse)

    // Add the AI response to the chat history
    setChatHistory((prevHistory) => {
      console.log('Updating chat history with AI response')
      return [...prevHistory, aiResponse]
    })

    // Save the updated chat history
    chrome.storage.local.set({ chatHistory: [...chatHistory, systemMessage, aiResponse] }, () => {
      console.log('Chat history saved to storage')
    })
  }

  const handleContactClick = () => {
    window.location.href =
      'mailto:rostyslav.dzhohola@pm.me?subject=Feedback%20on%20Discord%20AI%20Extension'
  }

  return (
    <main className="side-panel">
      <div className="button-container">
        <button onClick={handleResetChat} className="reset-button">
          Clear Chat
        </button>
        <button onClick={handleResearchClick} className="research-button">
          Research
        </button>
        <div style={{ flexGrow: 1 }}></div>
        <button onClick={handleContactClick} className="contact-button">
          Contact
        </button>
      </div>
      <div className="chat-container" ref={chatContainerRef}>
        <div className="messages" ref={outputRef}>
          {chatHistory.length > 0 ? (
            chatHistory.map((message, index) => (
              <div
                key={index}
                className={`message ${message.role} ${message.isExtracted ? 'extracted' : ''}`}
              >
                <pre>{message.content}</pre>
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
          disabled={isStreaming || !apiKey}
        />
        <button
          onClick={handleStreamText}
          disabled={isStreaming || !prompt.trim() || !apiKey}
          className="ask-button"
        >
          {isStreaming ? 'Asking...' : 'Ask'}
        </button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Research Setup</h2>
            <p>How many messages would you like to upload to AI?</p>
            <input
              type="number"
              value={messageCount}
              onChange={(e) => setMessageCount(Number(e.target.value))}
              min="1"
              placeholder="Enter number of messages"
            />
            <button onClick={handleModalSubmit}>Submit</button>
            <button onClick={() => setIsModalOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </main>
  )
}

export default SidePanel
