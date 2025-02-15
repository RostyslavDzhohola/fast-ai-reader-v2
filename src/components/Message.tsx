import React from 'react'
import ReactMarkdown from 'react-markdown'
import { ExtendedMessage } from '../types/chat'

type MessageProps = {
  message: ExtendedMessage
  isCollapsed: boolean
  onToggleCollapse: (messageId: string) => void
  onUsernameClick: (username: string) => void
}

export const Message: React.FC<MessageProps> = ({
  message,
  isCollapsed,
  onToggleCollapse,
  onUsernameClick,
}) => {
  const handleClick = () => {
    if (message.isExtracted) {
      onToggleCollapse(message.id)
    }
  }

  const handleUsernameClick = (username: string | undefined) => {
    if (!username || typeof username !== 'string') {
      console.error('Invalid username clicked:', username)
      return
    }

    // First try to extract username if it's from message content
    let processedUsername = username
    if (message.content && typeof message.content === 'string') {
      try {
        processedUsername = extractUsername(message)
      } catch (error) {
        console.error('Error extracting username from message:', error)
      }
    }

    // Clean the username regardless of source
    const cleanUsername = processedUsername.replace(/[<>@]/g, '').trim()
    if (!cleanUsername) {
      console.error('Username became empty after cleaning:', {
        original: username,
        cleaned: cleanUsername,
      })
      return
    }

    onUsernameClick?.(cleanUsername)
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
          <span className="collapse-indicator">{isCollapsed ? '▼' : '▲'}</span>
        </div>
        {!isCollapsed && <pre dangerouslySetInnerHTML={{ __html: message.content }} />}
      </div>
    )
  }

  return (
    <div className={`message ${message.role}`}>
      <ReactMarkdown
        components={{
          strong: ({ node, children }) => <strong>{children}</strong>,
          em: ({ node, children }) => (
            <em onClick={() => handleUsernameClick(String(children))} style={{ cursor: 'pointer' }}>
              {children}
            </em>
          ),
        }}
      >
        {message.content}
      </ReactMarkdown>
    </div>
  )
}

export default Message
