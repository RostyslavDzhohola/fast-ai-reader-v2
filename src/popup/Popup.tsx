import React, { useState, useEffect } from 'react'
import './Popup.css'

export const Popup: React.FC = () => {
  const [isDiscordPage, setIsDiscordPage] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [hasDiscordTab, setHasDiscordTab] = useState(false)
  const [activeDiscordTabId, setActiveDiscordTabId] = useState<number | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [registrationRequired, setRegistrationRequired] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

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

  useEffect(() => {
    // If user is signed in and on Discord, show side panel and close popup
    if (isSignedIn && isDiscordPage) {
      chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
        if (tab?.id) {
          await chrome.sidePanel.setOptions({
            tabId: tab.id,
            enabled: true,
            path: 'sidepanel.html',
          })
          window.close()
        }
      })
    }
  }, [isSignedIn, isDiscordPage])

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true)
      console.log('User clicked sign in with Google button')
      const response = await chrome.runtime.sendMessage({ action: 'initiateGoogleAuth' })

      console.log('Auth response:', response)

      if (!response.success) {
        if (response.error === 'REGISTRATION_REQUIRED') {
          console.log('Registration required, showing registration prompt')
          setRegistrationRequired(true)
          setIsSigningIn(false)
          return
        }
        throw new Error(response.error || 'Authentication failed')
      }

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
    } catch (error) {
      console.error('Authentication failed:', error)
      setRegistrationRequired(false)
    } finally {
      setIsSigningIn(false)
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

  const handleRegistration = () => {
    chrome.tabs.create({ url: 'https://discord-ai-orcin.vercel.app/' })
    window.close()
  }

  useEffect(() => {
    // Minimal timeout to ensure smooth transition
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 50)

    return () => clearTimeout(timer)
  }, [])

  if (!isSignedIn) {
    if (registrationRequired) {
      return (
        <div className={`popup-container ${isLoading ? 'loading' : ''}`}>
          <div className="auth-container">
            <h2>Registration Required</h2>
            <p>Please register on our website first to use this extension.</p>
            <button
              onClick={() =>
                chrome.tabs.create({
                  url: 'https://discord-ai-orcin.vercel.app/',
                  active: true,
                })
              }
              className="registration-button"
            >
              Register Now
            </button>
            <button onClick={() => setRegistrationRequired(false)} className="back-button">
              Back
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className={`popup-container ${isLoading ? 'loading' : ''}`}>
        <div className="auth-container">
          <p>Please sign in with Google to use this extension.</p>
          <button onClick={handleSignIn} className="sign-in-button" disabled={isSigningIn}>
            {isSigningIn ? (
              <span className="loading-container">
                <span className="loading-spinner"></span>
                Signing in...
              </span>
            ) : (
              'Sign in with Google'
            )}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`popup-container ${isLoading ? 'loading' : ''}`}>
      <div className="success-container">
        <h2>Not on Discord</h2>
        <p>{hasDiscordTab ? 'Switch to Discord tab' : 'Open Discord'} to use the extension.</p>
        <button onClick={handleDiscordNavigation} className="discord-button">
          {hasDiscordTab ? 'Switch to Discord Tab' : 'Go to Discord'}
        </button>
      </div>
    </div>
  )
}

export default Popup
