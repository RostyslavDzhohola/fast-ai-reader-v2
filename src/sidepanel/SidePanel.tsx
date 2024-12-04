import React, { useState, useRef, useEffect } from 'react'
import './SidePanel.css'
import { useChat } from 'ai/react'

// TODO: Replace the API key with the fetch request to my API backend
// Development API endpoint: https://localhost:3000/api/chat
// Production API endpoint: https://discord-ai-extension.vercel.app/api/chat

// Define a type for our chat messages
type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  isExtracted?: boolean // New property to indicate extracted messages
}

// Add near the top, after imports
const logPrefix = '[SidePanel]'

export const SidePanel: React.FC = () => {
  const [authToken, setAuthToken] = useState<string>('')

  useEffect(() => {
    chrome.storage.local.get('authToken').then((result) => {
      if (result.authToken) {
        console.log(`${logPrefix} Auth token loaded from storage`)
        setAuthToken(result.authToken)
      } else {
        console.warn(`${logPrefix} No auth token found in storage`)
      }
    })
  }, [])

  // useEffect(() => {
  //   if (authToken) {
  //     console.log(`${logPrefix} Current auth token:`, {
  //       token: authToken,
  //       length: authToken.length,
  //       prefix: authToken.substring(0, 15) + '...',
  //     })
  //   }
  // }, [authToken])

  const {
    messages: aiMessages,
    input,
    handleInputChange,
    handleSubmit,
    error,
    isLoading,
    setMessages,
    append,
  } = useChat({
    api: 'http://localhost:3000/api/chat',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    credentials: 'same-origin',
    onResponse: (response: Response) => {
      // Log detailed request information
      console.log(`${logPrefix} Request details:`, {
        url: response.url,
        method: response.type,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      })

      // Log all request headers
      const requestHeaders = Array.from(response.headers.entries())
      console.log(`${logPrefix} Request headers:`, {
        authorization: response.headers.get('authorization'),
        contentType: response.headers.get('content-type'),
        allHeaders: Object.fromEntries(requestHeaders),
      })

      // Log response details
      console.log(`${logPrefix} Response details:`, {
        status: response.status,
        statusText: response.statusText,
        type: response.type,
        ok: response.ok,
      })

      // Log response headers
      const responseHeaders = Object.fromEntries(response.headers.entries())
      console.log(`${logPrefix} Response headers:`, responseHeaders)

      // Log response body
      response
        .clone() // Clone the response to avoid consuming it
        .json()
        .then((data) => {
          console.log(`${logPrefix} Response body:`, {
            data,
            type: typeof data,
            keys: Object.keys(data),
          })
        })
        .catch((err) => {
          console.error(`${logPrefix} Error parsing response body:`, err)
          // Try to get the raw text if JSON parsing fails
          response
            .clone()
            .text()
            .then((text) => {
              console.log(`${logPrefix} Raw response body:`, text)
            })
        })
    },
    onError: (error) => {
      console.error(`${logPrefix} Chat error:`, {
        name: error.name,
        message: error.message,
        stack: error.stack,
      })

      // Log additional error context if available
      if (error instanceof Response) {
        console.error(`${logPrefix} Response error details:`, {
          status: error.status,
          statusText: error.statusText,
          headers: Object.fromEntries(error.headers.entries()),
        })
      }
    },
  })

  console.log('Side panel component mounted')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const outputRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // New state for modal and message count
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [messageCount, setMessageCount] = useState<number>(10) // Default to 10 messages

  // Add this state near your other state declarations
  const [isSignedIn, setIsSignedIn] = useState(true)

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      console.log(`${logPrefix} Submitting message with auth:`, {
        hasToken: !!authToken,
        tokenLength: authToken?.length,
        tokenPrefix: authToken ? `${authToken.substring(0, 15)}...` : 'none',
        input,
      })
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  const handleResetChat = () => {
    setMessages([])
    console.log('Chat history cleared')
  }

  const handleResearchClick = () => {
    // TODO: rebuild to use the new flow from useChat
    setIsModalOpen(true)
  }

  const handleModalSubmit = () => {
    console.log(`${logPrefix} Requesting to extract ${messageCount} messages`)

    chrome.runtime.sendMessage(
      {
        action: 'extractMessages',
        count: messageCount,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(`${logPrefix} Error:`, chrome.runtime.lastError)
          return
        }

        try {
          if (response?.messages && Array.isArray(response.messages)) {
            console.log(`${logPrefix} Received ${response.messages.length} messages`)
            processReceivedMessages(response.messages)
          } else {
            console.error(`${logPrefix} Invalid response format:`, response)
          }
        } catch (error) {
          console.error(`${logPrefix} Processing error:`, error)
        }
      },
    )

    setIsModalOpen(false)
  }

  // Update processReceivedMessages to include more logging
  const processReceivedMessages = (messages: string[]) => {
    console.log(`${logPrefix} Processing ${messages.length} messages`)
    console.log(`${logPrefix} First message preview:`, messages[0]?.substring(0, 100))
    console.log(
      `${logPrefix} Last message preview:`,
      messages[messages.length - 1]?.substring(0, 100),
    )

    const messagesText = messages.join('\n')
    console.log(`${logPrefix} Combined messages length:`, messagesText.length)

    // Log the message being sent to AI
    const aiMessage = {
      role: 'user' as const,
      content: `I have extracted ${messages.length} messages from a Discord chat. Please analyze these messages and be ready to answer questions about them. Here are the messages:\n\n${messagesText}`,
      id: Date.now().toString(),
    }
    console.log(`${logPrefix} Sending message to AI:`, aiMessage)

    append(aiMessage)
  }

  const handleContactClick = () => {
    window.location.href =
      'mailto:rostyslav.dzhohola@pm.me?subject=Feedback%20on%20Discord%20AI%20Extension'
  }

  // Add error effect to log any chat errors
  useEffect(() => {
    if (error) {
      console.error(`${logPrefix} Chat error occurred:`, error)
    }
  }, [error])

  // Add loading state effect
  useEffect(() => {
    console.log(`${logPrefix} Chat loading state:`, isLoading)
  }, [isLoading])

  // Update the auth state effect
  useEffect(() => {
    const handleAuthStateChange = (message: any) => {
      if (message.action === 'AUTH_STATE_CHANGED') {
        console.log('Auth state changed:', message.state)

        if (message.state === 'SIGNED_IN') {
          setIsSignedIn(true)
          setAuthToken(message.token)
          console.log('User signed in, token:', message.token)
        } else if (message.state === 'SIGNED_OUT') {
          setIsSignedIn(false)
          setAuthToken('')
          setMessages([])
          console.log('User signed out')
        }
      }
    }

    chrome.runtime.onMessage.addListener(handleAuthStateChange)
    return () => chrome.runtime.onMessage.removeListener(handleAuthStateChange)
  }, [])

  // Add this component for the signed-out state
  const SignedOutView = () => {
    const handleOptionsClick = () => {
      chrome.runtime.openOptionsPage()
    }

    return (
      <div className="signed-out-container">
        <div className="signed-out-content">
          <h2>Not Signed In</h2>
          <p>You need to be signed in to use the Discord AI Assistant.</p>
          <button onClick={handleOptionsClick} className="sign-in-button">
            Go to Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="side-panel">
      {isSignedIn ? (
        // Your existing chat UI
        <>
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
              {aiMessages.length > 0 ? (
                aiMessages.map((message) => (
                  <div key={message.id} className={`message ${message.role}`}>
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
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here..."
              className="prompt-input"
              disabled={isLoading}
            />
            <button
              onClick={(e) => handleSubmit(e as any)}
              disabled={isLoading || !input.trim()}
              className="ask-button"
            >
              {isLoading ? 'Asking...' : 'Ask'}
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
        </>
      ) : (
        <SignedOutView />
      )}
    </main>
  )
}

export default SidePanel
