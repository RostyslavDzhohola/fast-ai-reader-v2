import { useCallback } from 'react'

const logPrefix = '[useUsernameSearch]'

export const useUsernameSearch = () => {
  const searchUsername = useCallback((text: string) => {
    console.log(`${logPrefix} Searching for username:`, text)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'find_username',
          username: text,
        })
      }
    })
  }, [])

  return { searchUsername }
}

export default useUsernameSearch
