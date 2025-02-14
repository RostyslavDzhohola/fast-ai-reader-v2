import React from 'react'

type HelpModalProps = {
  isOpen: boolean
  onClose: () => void
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Important Notice for Moderators</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <p>
            If you don't want this tool to be used on your Discord server, please contact us and we
            will remove access of this extension from your server.
          </p>
          <button
            className="contact-button-primary"
            onClick={() => {
              const emailSubject = encodeURIComponent(
                'Please remove my Discord server from Fast AI Reader',
              )
              const emailBody = encodeURIComponent(
                'Please specify your Discord server URL here:\n\n',
              )
              window.location.href = `mailto:rostyslav.dzhohola@pm.me?subject=${emailSubject}&body=${emailBody}`
            }}
          >
            Contact Us
          </button>
        </div>
      </div>
    </div>
  )
}

export default HelpModal
