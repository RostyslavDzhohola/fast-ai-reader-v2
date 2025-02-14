import { useCallback } from 'react'

const logPrefix = '[useUsernameSearch]'

export const useUsernameSearch = () => {
  const searchUsername = useCallback((text: string | undefined | null) => {
    // Validate input
    if (!text || typeof text !== 'string') {
      console.error(`${logPrefix} Invalid username provided:`, text)
      return
    }

    // Trim the username and check if it's empty
    const trimmedUsername = text.trim()
    if (!trimmedUsername) {
      console.error(`${logPrefix} Username cannot be empty`)
      return
    }

    console.log(`${logPrefix} Searching for username:`, trimmedUsername)

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) {
        console.error(`${logPrefix} No active tab found`)
        return
      }

      // Send message with validated username
      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          action: 'find_username',
          username: trimmedUsername,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(`${logPrefix} Error sending message:`, chrome.runtime.lastError)
          }
        },
      )
    })
  }, [])

  return { searchUsername }
}

export default useUsernameSearch
