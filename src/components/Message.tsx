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
            <em onClick={() => onUsernameClick(String(children))} style={{ cursor: 'pointer' }}>
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
