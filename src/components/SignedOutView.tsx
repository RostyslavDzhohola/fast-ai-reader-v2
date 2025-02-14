import React from 'react'

export const SignedOutView: React.FC = () => {
  const handleOptionsClick = () => {
    chrome.runtime.openOptionsPage()
  }

  return (
    <div className="signed-out-container">
      <div className="signed-out-content">
        <h2>Not Signed In</h2>
        <p>You need to be signed in to use the Discord AI Assistant.</p>
        <button onClick={handleOptionsClick} className="sign-in-button">
          Go to Sign In
        </button>
      </div>
    </div>
  )
}

export default SignedOutView
