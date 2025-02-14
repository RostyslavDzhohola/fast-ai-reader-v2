import { useState, useEffect } from 'react'
import { isGuildRestricted } from '../config/restrictions'

const logPrefix = '[useGuildRestriction]'

export const useGuildRestriction = () => {
  const [isBlockedGuild, setIsBlockedGuild] = useState<boolean>(false)

  useEffect(() => {
    const handleUrlChange = (message: any) => {
      if (message.action === 'URL_CHANGED') {
        console.log(`${logPrefix} URL changed:`, message)
        setIsBlockedGuild(message.isBlocked)
      }
    }

    // Add message listeners for both runtime and tabs
    chrome.runtime.onMessage.addListener(handleUrlChange)

    // Check current URL on mount and set up interval to check periodically
    const checkCurrentUrl = async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.url) {
        // Extract guild ID from Discord URL
        const guildMatch = tab.url.match(/discord\.com\/channels\/(\d+)/)
        const guildId = guildMatch ? guildMatch[1] : null
        const isBlocked = guildId ? isGuildRestricted(guildId) : false
        setIsBlockedGuild(isBlocked)
      }
    }

    // Check immediately on mount
    checkCurrentUrl()

    // Set up periodic check every second
    const intervalId = setInterval(checkCurrentUrl, 1000)

    // Request initial state from background
    chrome.runtime.sendMessage({ action: 'sidePanelReady' })

    // Cleanup
    return () => {
      chrome.runtime.onMessage.removeListener(handleUrlChange)
      clearInterval(intervalId)
    }
  }, [])

  return {
    isBlockedGuild,
  }
}

export default useGuildRestriction
