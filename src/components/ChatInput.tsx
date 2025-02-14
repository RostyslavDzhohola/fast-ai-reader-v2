import React from 'react'

type ChatInputProps = {
  input: string
  isLoading: boolean
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  isLoading,
  onInputChange,
  onSubmit,
  onKeyDown,
}) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isLoading && input.trim()) {
      onSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="input-container">
      <input
        type="text"
        value={input}
        onChange={onInputChange}
        onKeyDown={onKeyDown}
        placeholder="Type your message here..."
        className="prompt-input"
        disabled={isLoading}
      />
      <button type="submit" disabled={isLoading || !input.trim()} className="ask-button">
        {isLoading ? 'Asking...' : 'Ask'}
      </button>
    </form>
  )
}

export default ChatInput
