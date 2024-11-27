import React, { useState, useEffect, useRef } from 'react'
import './Options.css'

// Interface defining the structure of Google user information
interface GoogleUserInfo {
  email: string
  picture: string
  name: string
}

export const Options: React.FC = () => {
  const [apiKey, setApiKey] = useState('')
  const [isKeySet, setIsKeySet] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [isGoogleSignedIn, setIsGoogleSignedIn] = useState(false)
  const [userInfo, setUserInfo] = useState<GoogleUserInfo | null>(null)
  const highlightedKeyRef = useRef<HTMLSpanElement>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [registrationRequired, setRegistrationRequired] = useState(false)

  // Main initialization effect that sets up auth listener and loads initial data
  useEffect(() => {
    // Listener for authentication state changes from background script
    const authStateListener = (message: any) => {
      if (message.action === 'authStateChanged') {
        console.log('Auth state changed:', message.isAuthenticated)
        if (message.isAuthenticated) {
          fetchUserInfo()
        } else {
          setIsGoogleSignedIn(false)
          setUserInfo(null)
        }
      }
    }

    // Initialize data and set up listeners
    const initialize = async () => {
      // Load the API key from chrome storage
      const apiKeyResult = await chrome.storage.sync.get(['openaiApiKey'])
      if (apiKeyResult.openaiApiKey) {
        setApiKey(apiKeyResult.openaiApiKey)
        setIsKeySet(true)
      }

      // Perform initial authentication check
      await fetchUserInfo()
    }

    // Set up listener and initialize component
    chrome.runtime.onMessage.addListener(authStateListener)
    initialize()

    // Cleanup listener on component unmount
    return () => {
      chrome.runtime.onMessage.removeListener(authStateListener)
    }
  }, [])

  // Fetches user information from Google's API using stored token
  const fetchUserInfo = async () => {
    try {
      const tokenResult = await chrome.storage.local.get('googleToken')
      if (!tokenResult.googleToken) {
        setIsGoogleSignedIn(false)
        return
      }

      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokenResult.googleToken}`,
        },
      })

      if (!response.ok) {
        // Clean up invalid token
        await chrome.storage.local.remove(['googleToken', 'tokenTimestamp'])
        setIsGoogleSignedIn(false)
        return
      }

      const data = await response.json()
      setIsGoogleSignedIn(true)
      setUserInfo({
        email: data.email,
        picture: data.picture,
        name: data.name,
      })
    } catch (error) {
      console.error('Error fetching user info:', error)
      setIsGoogleSignedIn(false)
      setUserInfo(null)
      await chrome.storage.local.remove(['googleToken', 'tokenTimestamp'])
    }
  }

  // Handles changes to the API key input field
  const handleApiKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(event.target.value)
  }

  // Saves the API key to chrome storage
  const saveApiKey = () => {
    chrome.storage.sync.set({ openaiApiKey: apiKey }, () => {
      setIsKeySet(true)
      alert('API key saved successfully!')
    })
  }

  // Removes the API key from chrome storage
  const deleteApiKey = () => {
    chrome.storage.sync.remove('openaiApiKey', () => {
      setApiKey('')
      setIsKeySet(false)
      alert('API key deleted successfully!')
    })
  }

  // Handles user sign-out process
  const handleSignOut = async () => {
    try {
      console.log('User clicked sign out button')
      await chrome.runtime.sendMessage({ action: 'signOut' })
      setIsGoogleSignedIn(false)
      setUserInfo(null)
      console.log('User signed out successfully')
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  // Masks the API key for display purposes
  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '****...****'
    return `${key.slice(0, 4)}...${key.slice(-4)}`
  }

  // Copies the API key to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey).then(() => {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 1000)
    })
  }

  // Handles user sign-in process
  const handleSignIn = async () => {
    try {
      setIsSigningIn(true)
      console.log('User clicked sign in with Google button')
      const response = await chrome.runtime.sendMessage({ action: 'initiateGoogleAuth' })

      if (!response.success) {
        if (response.error === 'REGISTRATION_REQUIRED') {
          setRegistrationRequired(true)
          return
        }
        throw new Error(response.error || 'Authentication failed')
      }

      if (response.userInfo) {
        setIsGoogleSignedIn(true)
        setUserInfo(response.userInfo)
        console.log('User signed in successfully:', response.userInfo)
      } else {
        throw new Error('No user information received')
      }
    } catch (error) {
      console.error('Sign in failed:', error)
      setIsGoogleSignedIn(false)
      setUserInfo(null)

      // Only show error message for non-registration errors
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in with Google'
      if (!errorMessage.includes('REGISTRATION_REQUIRED')) {
        const errorElement = document.createElement('div')
        errorElement.className = 'error-message'
        errorElement.textContent = 'Sign in failed. Please try again.'

        const container = document.querySelector('.user-profile')
        if (container) {
          const existingError = container.querySelector('.error-message')
          if (existingError) {
            existingError.remove()
          }
          container.appendChild(errorElement)
          setTimeout(() => errorElement.remove(), 3000)
        }
      }
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <div className="options-layout">
      {isGoogleSignedIn && userInfo ? (
        <div className="user-profile">
          <img src={userInfo.picture} alt="Profile" className="profile-image" />
          <div className="user-info">
            <h3>{userInfo.name}</h3>
            <p>{userInfo.email}</p>
          </div>
          <button onClick={handleSignOut} className="sign-out-button">
            Sign Out
          </button>
        </div>
      ) : (
        <div className="user-profile">
          {registrationRequired ? (
            <>
              <h3>Registration Required</h3>
              <p>Please register on our website first to use this extension.</p>
              <button
                onClick={() => chrome.tabs.create({ url: 'https://discord-ai-orcin.vercel.app/' })}
                className="registration-button"
              >
                Register Now
              </button>
              <button onClick={() => setRegistrationRequired(false)} className="back-button">
                Back
              </button>
            </>
          ) : (
            <>
              <h3>Not Signed In</h3>
              <p>Sign in to use the extension</p>
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
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default Options
