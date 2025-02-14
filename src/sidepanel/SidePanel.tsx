import React, { useState, useRef, useEffect } from 'react'
import './SidePanel.css'
import { useChat } from '@ai-sdk/react'
import { Message as AIMessage } from '@ai-sdk/ui-utils'
import { isGuildRestricted } from '../config/restrictions'
import ReactMarkdown from 'react-markdown'
import ErrorPopup from '../components/ErrorPopup'
import BlockedGuildView from '../components/BlockedGuildView'
import HelpModal from '../components/HelpModal'
import SignedOutView from '../components/SignedOutView'
import ResearchModal from '../components/ResearchModal'
import ChatInput from '../components/ChatInput'
import Message from '../components/Message'
import ChatControls from '../components/ChatControls'
import useUsernameSearch from '../hooks/useUsernameSearch'
import useChatHistory from '../hooks/useChatHistory'
import { ExtendedMessage } from '../types/chat'
import { useScroll } from '../hooks/useScroll'
import useGuildRestriction from '../hooks/useGuildRestriction'

// TODO: Replace the API key with the fetch request to my API backend

// TODO: Bug: if i haven't signed in seven days and i open the chrome extension it doesn't prompt me to sign back again and doesn't notify me that i haven't been signed in it just tries to make requests but it cannot because it doesn't have the token to perform sign in so i have to fix the sign-in pop-up or shoving sign-in Basically I need to add error handling for making requests in case the sign-in did not showcase again. If I get error, it has to check if I'm signed in. If I'm not signed in, it has to change that state in order to show me a sign-in pop-up

// TODO: The chat generation is not smooth. It's too buggy.
// Development API endpoint: https://localhost:3000/api/chat
// Production API endpoint: https://discord-ai-extension.vercel.app/api/chat
// Main API endpoint: https://www.fastaireader.com/api/chat

// Add near the top, after imports
const logPrefix = '[SidePanel]'

// Track if text is both bold and italic
let isBoldAndItalic = false

export const SidePanel: React.FC = () => {
  const { searchUsername } = useUsernameSearch()
  const [authToken, setAuthToken] = useState<string>('')
  const [isSignedIn, setIsSignedIn] = useState(false)
  // Add state for error popup
  const [errorPopup, setErrorPopup] = useState<{
    show: boolean
    message: string
    details?: string[]
  }>({ show: false, message: '' })

  const {
    messages: aiMessages,
    input,
    handleInputChange,
    handleSubmit: originalHandleSubmit,
    error,
    isLoading,
    setMessages,
    append,
  } = useChat({
    api: 'https://discord-ai-extension.vercel.app/api/chat', // Don't forget https for production
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    credentials: 'same-origin',
    initialMessages: [],
    onResponse: (response: Response) => {
      // Log request details that don't require body reading
      console.log(`${logPrefix} Request details:`, {
        url: response.url,
        method: response.type,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      })

      // Verify the content type
      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('text/event-stream')) {
        console.warn(`${logPrefix} Warning: Unexpected content type:`, contentType)
      }
    },
  })

  // Modify handleSubmit to use append instead of direct storage
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (!input.trim()) return

    // Create user message
    const userMessage: AIMessage = {
      content: input,
      role: 'user',
      id: Date.now().toString(),
    }

    // Use append to add the message (this will trigger the useEffect)
    append(userMessage)

    // Call original submit handler
    await originalHandleSubmit(e)
  }

  // Update the handleKeyDown to use new handleSubmit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault()
      handleSubmit(e as any as React.FormEvent<HTMLFormElement>)
    }
  }

  // Use chat history hook
  const { loadChatHistory } = useChatHistory(aiMessages as ExtendedMessage[], setMessages as any)

  // Update the auth state effect to also handle message loading
  useEffect(() => {
    const handleAuthStateChange = (message: any) => {
      if (message.action === 'AUTH_STATE_CHANGED') {
        console.log('Auth state changed:', message.state)

        if (message.state === 'SIGNED_IN') {
          setIsSignedIn(true)
          setAuthToken(message.token)
          console.log('User signed in, token:', message.token)
          // Load messages when user signs in
          loadChatHistory()
        } else if (message.state === 'SIGNED_OUT') {
          setIsSignedIn(false)
          setAuthToken('')
          setMessages([])
          console.log('User signed out')
        }
      }
    }

    // Check initial auth state and load messages if authenticated
    chrome.storage.local.get(['authToken'], (result) => {
      if (result.authToken) {
        setIsSignedIn(true)
        setAuthToken(result.authToken)
        // Load messages on initial mount if user is authenticated
        loadChatHistory()
      }
    })

    chrome.runtime.onMessage.addListener(handleAuthStateChange)
    return () => chrome.runtime.onMessage.removeListener(handleAuthStateChange)
  }, [])

  // console.log('Side panel component mounted')
  const [chatHistory, setChatHistory] = useState<AIMessage[]>([])

  // Add useScroll hook
  const { chatContainerRef, outputRef, shouldAutoScroll, scrollToBottom } = useScroll({
    isLoading,
    messagesLength: aiMessages.length,
  })

  // New state for modal and message count
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [messageCount, setMessageCount] = useState<number>(100) // Default to 10 messages

  const handleResetChat = () => {
    setMessages([])
    chrome.storage.local.remove('aiMessages').then(() => {
      console.log(`${logPrefix} Chat history cleared from storage`)
    })
  }

  const handleResearchClick = () => {
    // TODO: rebuild to use the new flow from useChat
    setIsModalOpen(true)
  }

  // Add new state for extraction progress
  const [extractionProgress, setExtractionProgress] = useState<{
    isLoading: boolean
    processedMessages: number
  }>({
    isLoading: false,
    processedMessages: 0,
  })

  const handleModalSubmit = () => {
    console.log(`${logPrefix} Requesting to extract ${messageCount} messages`)

    // Start loading state
    setExtractionProgress({
      isLoading: true,
      processedMessages: 0,
    })

    chrome.runtime.sendMessage(
      {
        action: 'extractMessages',
        count: messageCount,
      },
      (response) => {
        // Reset loading state regardless of outcome
        setExtractionProgress({
          isLoading: false,
          processedMessages: 0,
        })

        if (chrome.runtime.lastError) {
          console.error(`${logPrefix} Error:`, chrome.runtime.lastError)
          return
        }

        try {
          if (response?.messages && Array.isArray(response.messages)) {
            console.log(`${logPrefix} Received ${response.messages.length} messages`)
            processReceivedMessages(response.messages)
            // Only close the modal after successful processing
            setIsModalOpen(false)
          } else {
            console.error(`${logPrefix} Invalid response format:`, response)
          }
        } catch (error) {
          console.error(`${logPrefix} Processing error:`, error)
        }
      },
    )
  }

  // Add message extraction progress listener
  useEffect(() => {
    const handleExtractionProgress = (message: any) => {
      if (message.action === 'extractionProgress') {
        setExtractionProgress({
          isLoading: true,
          processedMessages: message.processedCount,
        })
      }
    }

    chrome.runtime.onMessage.addListener(handleExtractionProgress)
    return () => chrome.runtime.onMessage.removeListener(handleExtractionProgress)
  }, [])

  // Add new state for collapsed messages
  const [collapsedMessages, setCollapsedMessages] = useState<Set<string>>(new Set())

  // Add toggle function
  const toggleMessageCollapse = (messageId: string) => {
    setCollapsedMessages((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
      }
      return newSet
    })
  }

  // Add state for custom instructions
  const [customInstructions, setCustomInstructions] = useState<string>('')

  // Update processReceivedMessages to use custom instructions if provided
  const processReceivedMessages = (messages: string[]) => {
    const formattedMessages = messages.map((msg) => {
      const lines = msg.split('\n')
      if (lines.length >= 2) {
        return `<span class="message-header">${lines[0]}</span>${lines.slice(1).join('\n')}`
      }
      return msg
    })

    const messagesText = formattedMessages.join('\n')
    const messageId = Date.now().toString()

    // Use custom instructions if provided, otherwise use default
    const instructionText = customInstructions.trim()
      ? customInstructions.trim()
      : 'Please analyze these messages and be ready to answer questions about them.'

    const aiMessage = {
      role: 'user' as const,
      content: `I have extracted ${messages.length} messages from a Discord chat. ${instructionText} Here are the messages:\n\n${messagesText}`,
      id: messageId,
      isExtracted: true,
      messageCount: messages.length,
    }
    console.log(`${logPrefix} Sending message to AI:`, aiMessage)

    setCollapsedMessages((prev) => new Set(prev).add(messageId))
    append(aiMessage)

    // Reset custom instructions after sending
    setCustomInstructions('')
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

  // Add useGuildRestriction hook
  const { isBlockedGuild } = useGuildRestriction()

  // Add new state for help modal
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false)

  // Keep the existing useEffect for storage - it will now handle both user and AI messages
  useEffect(() => {
    if (aiMessages.length > 0) {
      chrome.storage.local.set({ aiMessages }).then(() => {
        // console.log(`${logPrefix} Saved ${aiMessages.length} messages to storage`, {
        //   lastMessage: aiMessages[aiMessages.length - 1],
        // })
      })
    }
  }, [aiMessages])

  // TODO: Add jump to bottom button whenever I am scrolling up.
  // TODO: Add loading messages icon while it is scanning the messages on the discord channel.
  // TODO: Move the summary of the messages how many were extracted and their dates at the bottom of the message.
  // TODO: make the loading of the stream of the chat reply smoother
  // TODO: add button for choosing which OpenAI model to use.

  // Modify the main render to show blocked state
  return (
    <main className="side-panel">
      <ErrorPopup
        show={errorPopup.show}
        message={errorPopup.message}
        details={errorPopup.details}
        onClose={() => setErrorPopup({ show: false, message: '' })}
      />
      {isBlockedGuild ? (
        <BlockedGuildView />
      ) : isSignedIn ? (
        // Your existing chat UI
        <>
          <ChatControls
            onClearChat={handleResetChat}
            onResearch={handleResearchClick}
            onHelp={() => setIsHelpModalOpen(true)}
            onContact={handleContactClick}
          />
          <div className="chat-container" ref={chatContainerRef}>
            <div className="messages" ref={outputRef}>
              {aiMessages.length > 0 ? (
                (aiMessages as ExtendedMessage[]).map((message) => (
                  <Message
                    key={message.id}
                    message={message}
                    isCollapsed={collapsedMessages.has(message.id)}
                    onToggleCollapse={toggleMessageCollapse}
                    onUsernameClick={searchUsername}
                  />
                ))
              ) : (
                <div className="empty-chat">AI response will appear here...</div>
              )}
            </div>
          </div>
          <ChatInput
            input={input}
            isLoading={isLoading}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
            onKeyDown={handleKeyDown}
          />

          {/* Modal */}
          <ResearchModal
            isOpen={isModalOpen}
            messageCount={messageCount}
            customInstructions={customInstructions}
            onSubmit={handleModalSubmit}
            onClose={() => {
              setIsModalOpen(false)
              setCustomInstructions('')
              setMessageCount(1)
              // Reset extraction progress when closing
              setExtractionProgress({
                isLoading: false,
                processedMessages: 0,
              })
            }}
            onMessageCountChange={(count) => setMessageCount(count)}
            onCustomInstructionsChange={(instructions) => setCustomInstructions(instructions)}
            isLoading={extractionProgress.isLoading}
            processedMessages={extractionProgress.processedMessages}
          />

          {/* Help Modal */}
          <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
        </>
      ) : (
        <SignedOutView />
      )}
    </main>
  )
}

export default SidePanel
