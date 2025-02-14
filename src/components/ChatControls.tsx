import React from 'react'

type ChatControlsProps = {
  onClearChat: () => void
  onResearch: () => void
  onHelp: () => void
  onContact: () => void
}

export const ChatControls: React.FC<ChatControlsProps> = ({
  onClearChat,
  onResearch,
  onHelp,
  onContact,
}) => {
  return (
    <div className="button-container">
      <button onClick={onClearChat} className="reset-button">
        Clear Chat
      </button>
      <button onClick={onResearch} className="research-button">
        Research
      </button>
      <div style={{ flexGrow: 1 }}></div>
      <button onClick={onHelp} className="help-icon">
        ?
      </button>
      <button onClick={onContact} className="contact-button">
        Contact
      </button>
    </div>
  )
}

export default ChatControls
