import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { ExtendedMessage } from '../types/chat'

type MessageProps = {
  message: ExtendedMessage
  isCollapsed?: boolean
  onToggleCollapse: (messageId: string) => void
  onUsernameClick: (username: string) => void
}

export const Message: React.FC<MessageProps> = ({
  message,
  isCollapsed = true,
  onToggleCollapse,
  onUsernameClick,
}) => {
  const [isLocalCollapsed, setIsLocalCollapsed] = useState(message.isExtracted ? true : false)

  const handleClick = () => {
    if (message.isExtracted) {
      setIsLocalCollapsed(!isLocalCollapsed)
      onToggleCollapse(message.id)
    }
  }

  const handleUsernameClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const clickedText = (e.target as HTMLElement).textContent
    if (!clickedText) return

    // Only process if it looks like a Discord username (no spaces, etc)
    if (clickedText.includes(' ') || clickedText.length < 2) {
      console.log('[Message] Ignoring invalid username format:', clickedText)
      return
    }

    // Debug: Log what we're clicking and what we're passing
    console.log('[Message] Username click:', {
      messageRole: message.role,
      messageContent: message.content,
      clickedElement: e.target,
      clickedText,
    })

    onUsernameClick(clickedText)
  }

  const extractUsername = (message: ExtendedMessage): string => {
    try {
      if (typeof message.content === 'string') {
        // If the content contains a username header, extract it
        const match = message.content.match(/<span class="message-header">(.*?)\s*\|/)
        if (match && match[1]) {
          return match[1].trim()
        }
      }
      // Fallback to a safe default
      return message.role === 'user' ? 'User' : 'Assistant'
    } catch (error) {
      console.error('Error extracting username:', error)
      return 'Unknown User'
    }
  }

  if (message.isExtracted) {
    return (
      <div
        className={`message ${message.role} extracted`}
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      >
        <div className="extracted-header">
          {`${message.messageCount} Messages Extracted`}
          <span className="collapse-indicator">{isLocalCollapsed ? '▼' : '▲'}</span>
        </div>
        {!isLocalCollapsed && <pre dangerouslySetInnerHTML={{ __html: message.content }} />}
      </div>
    )
  }

  return (
    <div className={`message ${message.role}`}>
      <ReactMarkdown
        components={{
          strong: ({ node, children }) => <strong>{children}</strong>,
          em: ({ node, children }) => {
            const text = String(children)
            // Only make it clickable if it looks like a username
            if (text.includes(' ') || text.length < 2) {
              return <em>{children}</em>
            }
            return (
              <em onClick={handleUsernameClick} style={{ cursor: 'pointer' }}>
                {children}
              </em>
            )
          },
        }}
      >
        {message.content}
      </ReactMarkdown>
    </div>
  )
}

export default Message
