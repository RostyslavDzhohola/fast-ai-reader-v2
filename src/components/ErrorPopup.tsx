import React from 'react'

type ErrorPopupProps = {
  show: boolean
  message: string
  details?: string[]
  onClose: () => void
}

export const ErrorPopup: React.FC<ErrorPopupProps> = ({ show, message, details, onClose }) => {
  if (!show) return null

  return (
    <div className="error-popup-overlay">
      <div className="error-popup">
        <div className="error-popup-header">
          <h3>{message}</h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="error-popup-content">
          {details?.map((detail, index) => <p key={index}>{detail}</p>)}
        </div>
      </div>
    </div>
  )
}

export default ErrorPopup
