import React, { useState, useEffect, useRef } from 'react'
import './Options.css'

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

  useEffect(() => {
    const initializeData = async () => {
      // Load the API key
      const apiKeyResult = await chrome.storage.sync.get(['openaiApiKey'])
      if (apiKeyResult.openaiApiKey) {
        setApiKey(apiKeyResult.openaiApiKey)
        setIsKeySet(true)
      }

      // Check Google auth status and fetch user info
      const tokenResult = await chrome.storage.local.get('googleToken')
      const isSignedIn = !!tokenResult.googleToken
      setIsGoogleSignedIn(isSignedIn)

      if (isSignedIn && tokenResult.googleToken) {
        try {
          const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              Authorization: `Bearer ${tokenResult.googleToken}`,
            },
          })
          if (response.ok) {
            const data = await response.json()
            setUserInfo({
              email: data.email,
              picture: data.picture,
              name: data.name,
            })
          }
        } catch (error) {
          console.error('Error fetching user info:', error)
        }
      }
    }

    initializeData()
  }, [])

  const handleApiKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(event.target.value)
  }

  const saveApiKey = () => {
    chrome.storage.sync.set({ openaiApiKey: apiKey }, () => {
      setIsKeySet(true)
      alert('API key saved successfully!')
    })
  }

  const deleteApiKey = () => {
    chrome.storage.sync.remove('openaiApiKey', () => {
      setApiKey('')
      setIsKeySet(false)
      alert('API key deleted successfully!')
    })
  }

  const handleGoogleSignOut = async () => {
    try {
      const { googleToken } = await chrome.storage.local.get('googleToken')
      if (googleToken) {
        await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${googleToken}`)
      }
      await chrome.storage.local.remove('googleToken')
      setIsGoogleSignedIn(false)
      setUserInfo(null)
      alert('Successfully signed out from Google')
    } catch (error) {
      console.error('Error signing out:', error)
      alert('Error signing out from Google')
    }
  }

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '****...****'
    return `${key.slice(0, 4)}...${key.slice(-4)}`
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey).then(() => {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 1000)
    })
  }

  const handleSignIn = async () => {
    try {
      const success = await chrome.runtime.sendMessage({ action: 'initiateGoogleAuth' })
      if (success) {
        setIsGoogleSignedIn(true)
        // Refresh user info after sign in
        const tokenResult = await chrome.storage.local.get('googleToken')
        if (tokenResult.googleToken) {
          const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              Authorization: `Bearer ${tokenResult.googleToken}`,
            },
          })
          if (response.ok) {
            const data = await response.json()
            setUserInfo({
              email: data.email,
              picture: data.picture,
              name: data.name,
            })
          }
        }
      }
    } catch (error) {
      console.error('Authentication failed:', error)
    }
  }

  return (
    <div className="options-layout">
      <aside className="user-profile-sidebar">
        {isGoogleSignedIn && userInfo ? (
          <div className="user-profile">
            <img src={userInfo.picture} alt="Profile" className="profile-image" />
            <div className="user-info">
              <h3>{userInfo.name}</h3>
              <p>{userInfo.email}</p>
            </div>
            <button onClick={handleGoogleSignOut} className="sign-out-button">
              Sign Out
            </button>
          </div>
        ) : (
          <div className="user-profile">
            <h3>Not Signed In</h3>
            <p>Sign in to use the extension</p>
            <button onClick={handleSignIn} className="sign-in-button">
              Sign in with Google
            </button>
          </div>
        )}
      </aside>

      <main className="options-container">
        <section className="api-key-section">
          <h3>{isKeySet ? 'API Key Set' : 'API Key Required'}</h3>
          {isKeySet ? (
            <div className="api-key-set">
              <p>
                Your API key is set:{' '}
                <span className="highlighted-key-container">
                  {copySuccess && <span className="copy-success">Copied</span>}
                  <span
                    ref={highlightedKeyRef}
                    className="highlighted-key"
                    onClick={copyToClipboard}
                    title="Click to copy"
                  >
                    {maskApiKey(apiKey)}
                  </span>
                </span>
              </p>
              <p>You're ready to use the extension!</p>
              <div className="button-container">
                <a
                  href="https://discord.com/app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="discord-link"
                >
                  Open Discord App
                </a>
                <button onClick={deleteApiKey} className="delete-button">
                  Delete API Key
                </button>
              </div>
            </div>
          ) : (
            <div className="api-key-container">
              <label htmlFor="api-key">OpenAI API Key:</label>
              <input
                type="password"
                id="api-key"
                value={apiKey}
                onChange={handleApiKeyChange}
                placeholder="Enter your OpenAI API key"
              />
              <button onClick={saveApiKey}>Save API Key</button>
              <iframe
                src="https://www.loom.com/embed/ab4e201e69664ceaa1e8139cde51f774?sid=cedc3274-2c56-4437-a761-3878af97d3be"
                frameBorder="0"
                allowFullScreen
              ></iframe>
              <p className="api-key-link">
                Don't have an API key?{' '}
                <a href="https://platform.openai.com/" target="_blank" rel="noopener noreferrer">
                  Get one here
                </a>
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default Options
