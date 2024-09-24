import { useState, useEffect } from 'react'

import './Popup.css'

export const Popup = () => {
  const [currentUrl, setCurrentUrl] = useState<string>('')

  useEffect(() => {
    console.log('Popup opened') // Log when the popup is opened

    // Request the current tab's URL from the background script
    chrome.runtime.sendMessage({ type: 'GET_CURRENT_URL' }, (response) => {
      console.log('Received response from background script:', response) // Log the response
      if (response && response.url) {
        setCurrentUrl(response.url)
        console.log('Current URL set to:', response.url) // Log the set URL
      } else {
        console.error('Failed to get current URL') // Log error if URL is not received
      }
    })
  }, [])

  return (
    <main>
      <h3>Current Page</h3>
      <div className="url-display">
        <p>You are currently on:</p>

        {currentUrl}
      </div>
    </main>
  )
}

export default Popup
