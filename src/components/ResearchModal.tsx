import React from 'react'

type ResearchModalProps = {
  isOpen: boolean
  messageCount: number
  customInstructions: string
  onSubmit: () => void
  onClose: () => void
  onMessageCountChange: (count: number) => void
  onCustomInstructionsChange: (instructions: string) => void
  isLoading?: boolean
  processedMessages?: number
}

export const ResearchModal: React.FC<ResearchModalProps> = ({
  isOpen,
  messageCount,
  customInstructions,
  onSubmit,
  onClose,
  onMessageCountChange,
  onCustomInstructionsChange,
  isLoading = false,
  processedMessages = 0,
}) => {
  if (!isOpen) return null

  // Calculate progress percentage
  const progress = messageCount > 0 ? (processedMessages / messageCount) * 100 : 0

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Research</h2>

        {!isLoading ? (
          // Show input fields when not loading
          <>
            <div className="modal-section number-input">
              <label>Number of messages to analyze</label>
              <input
                type="number"
                value={messageCount || ''} // Use empty string when value is 0
                onChange={(e) => {
                  const value = e.target.value
                  // Only update if the value is empty or a positive number
                  if (value === '' || parseInt(value) > 0) {
                    onMessageCountChange(value === '' ? 0 : parseInt(value))
                  }
                }}
                min="1"
                placeholder="1"
              />
            </div>
            <div className="modal-section textarea-input">
              <label>Custom Instructions (Optional)</label>
              <textarea
                value={customInstructions}
                onChange={(e) => onCustomInstructionsChange(e.target.value)}
                placeholder="Please analyze these messages and be ready to answer questions about them."
                rows={4}
              />
            </div>
          </>
        ) : (
          // Show only progress information when loading
          <div className="modal-section research-progress-section">
            <div className="research-progress-info">
              <span>
                Processing messages: {processedMessages} / {messageCount}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="research-progress-bar-container">
              <div className="research-progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="modal-buttons">
          {!isLoading ? (
            <>
              <button onClick={onSubmit} disabled={!messageCount || messageCount < 1}>
                Submit
              </button>
              <button onClick={onClose}>Cancel</button>
            </>
          ) : (
            <button disabled>Processing...</button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResearchModal
