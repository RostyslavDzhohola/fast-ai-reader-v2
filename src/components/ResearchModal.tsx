import React from 'react'

type ResearchModalProps = {
  isOpen: boolean
  messageCount: number
  customInstructions: string
  onSubmit: () => void
  onClose: () => void
  onMessageCountChange: (count: number) => void
  onCustomInstructionsChange: (instructions: string) => void
}

export const ResearchModal: React.FC<ResearchModalProps> = ({
  isOpen,
  messageCount,
  customInstructions,
  onSubmit,
  onClose,
  onMessageCountChange,
  onCustomInstructionsChange,
}) => {
  if (!isOpen) return null

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Research</h2>
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
        <div className="modal-buttons">
          <button onClick={onSubmit} disabled={!messageCount || messageCount < 1}>
            Submit
          </button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default ResearchModal
