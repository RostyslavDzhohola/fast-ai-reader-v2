import React, { useState, useEffect } from 'react'
import './Popup.css'

interface TabInfo {
  isDiscordPage: boolean
  hasDiscordTab: boolean
  activeDiscordTabId: number | null
  isBlockedGuild?: boolean
}

const BlockedGuildView = () => {
  return (
    <div className="blocked-guild-container">
      <div className="blocked-guild-content">
        <h2>Access Restricted</h2>
        <p>This Discord server has been restricted from using the AI Assistant extension.</p>
      </div>
    </div>
  )
}

const SignedOutView = () => {
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

export const Popup: React.FC = () => {
  const [isDiscordPage, setIsDiscordPage] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [hasDiscordTab, setHasDiscordTab] = useState(false)
  const [activeDiscordTabId, setActiveDiscordTabId] = useState<number | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [registrationRequired, setRegistrationRequired] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isBlockedGuild, setIsBlockedGuild] = useState<boolean>(false)

  useEffect(() => {
    const initializePopup = async () => {
      console.log('🚀 Initializing Popup')

      try {
        // Get both tab and auth info from background script
        const [tabInfoResponse, authStateResponse] = await Promise.all([
          chrome.runtime.sendMessage({ action: 'getTabInfo' }),
          chrome.runtime.sendMessage({ action: 'getAuthState' }),
        ])

        if (!tabInfoResponse.success || !authStateResponse.success) {
          throw new Error('Failed to initialize popup')
        }

        const { isDiscordPage, hasDiscordTab, activeDiscordTabId, isBlockedGuild } =
          tabInfoResponse.data
        const { isSignedIn, registrationRequired } = authStateResponse.data

        // Update all states at once
        setIsDiscordPage(isDiscordPage)
        setHasDiscordTab(hasDiscordTab)
        setIsSignedIn(isSignedIn)
        setRegistrationRequired(registrationRequired)
        setIsBlockedGuild(isBlockedGuild || false)
        if (activeDiscordTabId) {
          setActiveDiscordTabId(activeDiscordTabId)
        }

        // Handle side panel setup if conditions are met
        if (isSignedIn && isDiscordPage && !isBlockedGuild) {
          console.log('🎯 Setting up side panel')
          const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true })
          if (currentTab.id) {
            await chrome.runtime.sendMessage({
              action: 'setupSidePanel',
              tabId: currentTab.id,
              enabled: true,
            })
            console.log('🎯 Side panel setup complete')
          }
        }
      } catch (error) {
        console.error('❌ Popup initialization error:', error)
      }
    }

    initializePopup()
  }, [])

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

      // Handle post-signin actions in background
      await chrome.runtime.sendMessage({
        action: 'handlePostSignIn',
        isDiscordPage,
      })
      window.close()
    } catch (error) {
      console.error('Authentication failed:', error)
      setRegistrationRequired(false)
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleDiscordNavigation = async () => {
    try {
      await chrome.runtime.sendMessage({
        action: 'navigateToDiscord',
        discordTabId: activeDiscordTabId,
      })
      window.close()
    } catch (error) {
      console.error('Navigation failed:', error)
    }
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
                  url: 'https://fastaireader.com/',
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
    <div className="popup-container">
      {isBlockedGuild ? (
        <BlockedGuildView />
      ) : !isSignedIn ? (
        <SignedOutView />
      ) : (
        <div className={`popup-container ${isLoading ? 'loading' : ''}`}>
          <div className="success-container">
            <h2>Not on Discord</h2>
            <p>{hasDiscordTab ? 'Switch to Discord tab' : 'Open Discord'} to use the extension.</p>
            <button onClick={handleDiscordNavigation} className="discord-button">
              {hasDiscordTab ? 'Switch to Discord Tab' : 'Go to Discord'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Popup
