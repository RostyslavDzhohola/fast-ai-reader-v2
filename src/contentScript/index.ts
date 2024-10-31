console.info('contentScript is running')

// Notify background script that content script is ready
chrome.runtime.sendMessage({ action: 'contentScriptReady' })

// Function to extract messages from Discord
function extractMessages(count: number): string[] {
  const messages: string[] = []
  const maxScrollAttempts = 10
  let scrollAttempts = 0

  // Function to scroll the chat window
  function scrollChatUp() {
    const chatContainer = document.querySelector('[class*="messagesWrapper_"]')
    if (chatContainer) {
      chatContainer.scrollTop -= chatContainer.clientHeight
      return true
    }
    return false
  }

  // Function to extract messages
  function extractMessages() {
    const messageGroups = document.querySelectorAll('[id^="chat-messages-"]')
    let currentUsername = ''
    let currentTimestamp = ''

    messageGroups.forEach((group) => {
      const usernameElement = group.querySelector('span[id^="message-username-"]')
      const timestampElement = group.querySelector('time')
      const contentElements = group.querySelectorAll('div[id^="message-content-"]')

      if (usernameElement && timestampElement) {
        currentUsername = usernameElement.textContent?.trim() || 'Unknown User'
        currentTimestamp = timestampElement.textContent?.trim() || 'Unknown Time'
      }

      contentElements.forEach((contentElement) => {
        const content = contentElement.textContent?.trim() || ''
        const formattedMessage = `${currentUsername} | ${currentTimestamp}\n${content}\n\n`
        messages.push(formattedMessage)
      })
    })
  }

  // Main extraction loop
  while (messages.length < count && scrollAttempts < maxScrollAttempts) {
    extractMessages()

    if (messages.length < count) {
      const scrolled = scrollChatUp()
      if (!scrolled) break

      scrollAttempts++
      // Wait for new messages to load after scrolling
      new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  return messages.slice(-count)
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request)

  if (request.action === 'extractMessages') {
    try {
      const messages = extractMessages(request.count)
      console.log('Extracted messages:', messages)
      sendResponse({ messages })
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error extracting messages:', error)
        sendResponse({ error: error.message })
      } else {
        console.error('Unknown error:', error)
        sendResponse({ error: 'An unknown error occurred' })
      }
    }
  }
  return true // Keep the message channel open for async response
})
