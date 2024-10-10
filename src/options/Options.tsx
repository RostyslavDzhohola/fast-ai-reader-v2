import { useState, useEffect, useRef } from 'react'
import './Options.css'

export const Options = () => {
  const [apiKey, setApiKey] = useState('')
  const [isKeySet, setIsKeySet] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const highlightedKeyRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    // Load the API key from storage when the component mounts
    chrome.storage.sync.get(['openaiApiKey'], (result) => {
      if (result.openaiApiKey) {
        setApiKey(result.openaiApiKey)
        setIsKeySet(true)
      }
    })
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

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '****...****'
    return `${key.slice(0, 4)}...${key.slice(-4)}`
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey).then(() => {
      setCopySuccess(true)
      setTimeout(() => {
        setCopySuccess(false)
      }, 1000) // Hide after 1 second
    })
  }

  return (
    <main className="options-container">
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
    </main>
  )
}

export default Options
