import React, { useState, useEffect } from 'react'
import './Popup.css'

export const Popup: React.FC = () => {
  const [isDiscordPage, setIsDiscordPage] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)

  useEffect(() => {
    // Check both Discord page status and Google auth status
    const checkStatus = async () => {
      // Check current tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0].url || ''
        setIsDiscordPage(url.includes('discord.com'))
      })

      // Check Google auth status
      const result = await chrome.storage.local.get('googleToken')
      setIsSignedIn(!!result.googleToken)
    }

    checkStatus()
  }, [])

  const handleDiscordClick = () => {
    chrome.tabs.create({ url: 'https://discord.com/channels/@me' })
  }

  const handleSignIn = () => {
    chrome.runtime.sendMessage({ action: 'initiateGoogleAuth' }, (response) => {
      if (response?.success) {
        setIsSignedIn(true)
      }
    })
  }

  if (!isSignedIn) {
    return (
      <main>
        <h3>Fast AI Reader</h3>
        <p>Please sign in with Google to use this extension.</p>
        <button onClick={handleSignIn}>Sign in with Google</button>
      </main>
    )
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
