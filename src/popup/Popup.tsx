import React, { useState, useEffect } from 'react'
import './Popup.css'

export const Popup: React.FC = () => {
  const [isDiscordPage, setIsDiscordPage] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [hasDiscordTab, setHasDiscordTab] = useState(false)
  const [activeDiscordTabId, setActiveDiscordTabId] = useState<number | null>(null)

  useEffect(() => {
    const checkStatus = async () => {
      // Check current tab
      const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true })
      const isCurrentTabDiscord = currentTab.url?.includes('discord.com') || false
      setIsDiscordPage(isCurrentTabDiscord)

      // Check for any Discord tabs
      const allTabs = await chrome.tabs.query({ currentWindow: true })
      const discordTab = allTabs.find((tab) => tab.url?.includes('discord.com'))
      setHasDiscordTab(!!discordTab)
      if (discordTab?.id) {
        setActiveDiscordTabId(discordTab.id)
      }

      // Check Google auth status
      const result = await chrome.storage.local.get('googleToken')
      setIsSignedIn(!!result.googleToken)
    }

    checkStatus()
  }, [])

  const handleSignIn = async () => {
    try {
      const success = await chrome.runtime.sendMessage({ action: 'initiateGoogleAuth' })
      if (success) {
        setIsSignedIn(true)
        if (isDiscordPage) {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
          if (tab.id) {
            await chrome.sidePanel.setOptions({
              tabId: tab.id,
              path: 'sidepanel.html',
              enabled: true,
            })
            window.close()
          }
        }
      }
    } catch (error) {
      console.error('Authentication failed:', error)
    }
  }

  const handleDiscordNavigation = async () => {
    if (hasDiscordTab && activeDiscordTabId) {
      // Switch to existing Discord tab
      await chrome.tabs.update(activeDiscordTabId, { active: true })
    } else {
      // Open new Discord tab
      await chrome.tabs.create({ url: 'https://discord.com/channels/@me' })
    }
    window.close()
  }

  if (!isSignedIn) {
    return (
      <div className="popup-container">
        <div className="auth-container">
          <h2>Sign in Required</h2>
          <p>Please sign in with Google to use this extension.</p>
          <button onClick={handleSignIn} className="sign-in-button">
            Sign in with Google
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="popup-container">
      <div className="success-container">
        {isDiscordPage ? (
          <>
            <h2>Discord Page Detected</h2>
            <p>You can now use the side panel on this page.</p>
          </>
        ) : (
          <>
            <h2>Not on Discord</h2>
            <p>{hasDiscordTab ? 'Switch to Discord tab' : 'Open Discord'} to use the extension.</p>
            <button onClick={handleDiscordNavigation} className="discord-button">
              {hasDiscordTab ? 'Switch to Discord Tab' : 'Go to Discord'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default Popup
