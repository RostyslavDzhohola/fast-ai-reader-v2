import React, { useState, useEffect } from 'react'
import './Popup.css'

export const Popup: React.FC = () => {
  const [isDiscordPage, setIsDiscordPage] = useState(false)

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0].url || ''
      setIsDiscordPage(url.includes('discord.com'))
    })
  }, [])

  const handleDiscordClick = () => {
    chrome.tabs.create({ url: 'https://discord.com/channels/@me' })
  }

  return (
    <main>
      <h3>Fast AI Reader</h3>
      {isDiscordPage ? (
        <p>You are on a Discord page. The side panel should be available.</p>
      ) : (
        <div>
          <p>This extension is designed to work with Discord.</p>
          <button onClick={handleDiscordClick}>Go to Discord</button>
        </div>
      )}
    </main>
  )
}

export default Popup
