import { useCallback } from 'react'

const logPrefix = '[useUsernameSearch]'

export const useUsernameSearch = () => {
  const searchUsername = useCallback((text: string | undefined | null) => {
    // Debug: Log the exact input we're receiving
    console.log(`${logPrefix} Raw input:`, {
      text,
      type: typeof text,
      length: text?.length,
      charCodes: text?.split('').map((c) => c.charCodeAt(0)),
    })

    if (!text) {
      console.error(`${logPrefix} Invalid username provided: empty or null`)
      return
    }

    // Extract username if it contains a separator
    let username = text
    if (text.includes('|')) {
      username = text.split('|')[0].trim()
      console.log(`${logPrefix} Found separator, extracted:`, {
        before: text,
        after: username,
      })
    }

    // Trim and validate
    const trimmedUsername = username.trim()
    if (!trimmedUsername) {
      console.error(`${logPrefix} Username cannot be empty`)
      return
    }

    console.log(`${logPrefix} Final username to search:`, {
      original: text,
      processed: trimmedUsername,
    })

    chrome.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => {
        const activeTab = tabs[0]
        if (!activeTab?.id) {
          throw new Error('No active tab found')
        }

        return chrome.tabs.sendMessage(activeTab.id, {
          action: 'find_username',
          username: trimmedUsername,
        })
      })
      .catch((error) => {
        console.error(`${logPrefix} Error in username search:`, error)
      })
  }, [])

  return { searchUsername }
}

export default useUsernameSearch
