console.log('background is running')

// Function to check if a given URL is a Discord URL
function isDiscordUrl(url: string): boolean {
  return url.includes('discord.com')
}

// Function to set or unset the side panel based on whether the URL is Discord
async function setSidePanelForDiscord(tabId: number, url: string) {
  try {
    if (isDiscordUrl(url)) {
      console.log('Setting side panel for Discord URL')
      await chrome.sidePanel.setOptions({
        tabId,
        path: 'sidepanel.html',
        enabled: true,
      })
    } else {
      await chrome.sidePanel.setOptions({
        tabId,
        enabled: false,
      })
    }
  } catch (error) {
    handleError(error as Error)
  }
}

// Function to set popup options
async function setPopupOptions(tabId: number, enabled: boolean) {
  try {
    await chrome.action.setPopup({
      tabId,
      popup: enabled ? 'popup.html' : '',
    })
  } catch (error) {
    handleError(error as Error)
  }
}

// Function to handle tab updates and activations
function handleTabUpdate(tabId: number, url: string | undefined) {
  if (url) {
    setSidePanelForDiscord(tabId, url)
    setPopupOptions(tabId, !isDiscordUrl(url)) // Enable popup for non-Discord pages
  }
}

// Event listener for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  try {
    if (changeInfo.status === 'complete' && tab.url) {
      handleTabUpdate(tabId, tab.url)
    }
  } catch (error) {
    handleError(error as Error)
  }
})

// Event listener for tab activation (when user switches tabs)
chrome.tabs.onActivated.addListener((activeInfo) => {
  try {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
      if (tab.url) {
        handleTabUpdate(tab.id!, tab.url)
      }
    })
  } catch (error) {
    handleError(error as Error)
  }
})

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  if (tab.id && tab.url) {
    if (isDiscordUrl(tab.url)) {
      chrome.sidePanel.setOptions({ tabId: tab.id, enabled: true })
    } else {
      setPopupOptions(tab.id, true)
      // Chrome will automatically open the popup when it's set
    }
  }
})

// Add this new message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractMessages') {
    extractDiscordMessages(request.count)
      .then((messages) => {
        sendResponse({ messages })
      })
      .catch((error) => {
        console.error('Error extracting messages:', error)
        sendResponse({ error: 'Failed to extract messages' })
      })
    return true // Indicates that the response is sent asynchronously
  }
})

// Function to extract Discord messages
async function extractDiscordMessages(messageCount: number): Promise<string[]> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab.id) throw new Error('No active tab found')

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (count) => {
        const messages = []
        const messageElements = document.querySelectorAll('[id^="chat-messages-"]')
        const startIndex = Math.max(0, messageElements.length - count)

        for (let i = startIndex; i < messageElements.length; i++) {
          const messageElement = messageElements[i]
          const usernameElement = messageElement.querySelector('span[id^="message-username-"]')
          const timestampElement = messageElement.querySelector('time')
          const contentElement = messageElement.querySelector('div[id^="message-content-"]')

          if (usernameElement && timestampElement && contentElement) {
            const username = usernameElement.textContent?.trim() || 'Unknown User'
            const timestamp = timestampElement.textContent?.trim() || 'Unknown Time'
            const content = contentElement.textContent?.trim() || ''

            const formattedMessage = `${username} | ${timestamp}\n${content}\n\n`
            messages.push(formattedMessage)
          }
        }

        return messages
      },
      args: [messageCount],
    })

    return result[0].result
  } catch (error) {
    console.error('Error in extractDiscordMessages:', error)
    throw error
  }
}

function handleError(error: Error) {
  console.error('An error occurred:', error.message)
  if (error.message.includes('Extension context invalidated')) {
    console.log('Extension context invalidated. Attempting to reload...')
    chrome.runtime.reload()
  }
}
