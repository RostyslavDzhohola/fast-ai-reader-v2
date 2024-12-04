console.info('contentScript is running')

// Notify background script that content script is ready
chrome.runtime.sendMessage({ action: 'contentScriptReady' })

// Function to extract messages from Discord
async function extractMessages(count: number): Promise<string[]> {
  console.log('Starting message extraction, requested count:', count)
  const messages: string[] = []
  const maxScrollAttempts = 30
  let scrollAttempts = 0
  let previousMessageCount = 0

  function scrollChatUp() {
    const chatContainer = document.querySelector('[class*="messagesWrapper_"]')
    if (chatContainer) {
      const previousScrollTop = chatContainer.scrollTop
      chatContainer.scrollTop = Math.max(0, previousScrollTop - chatContainer.clientHeight * 2)
      const didScroll = previousScrollTop !== chatContainer.scrollTop
      return didScroll
    }
    return false
  }

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
        if (content) {
          const formattedMessage = `${currentUsername} | ${currentTimestamp}\n${content}\n\n`
          if (!messages.includes(formattedMessage)) {
            messages.push(formattedMessage)
          }
        }
      })
    })
  }

  async function scrollAndExtract() {
    while (messages.length < count && scrollAttempts < maxScrollAttempts) {
      const previousLength = messages.length
      extractMessages()

      if (messages.length === previousMessageCount) {
        scrollAttempts++
      }
      previousMessageCount = messages.length

      if (messages.length < count) {
        const scrolled = scrollChatUp()
        if (!scrolled) break

        await new Promise((resolve) => setTimeout(resolve, 1500))

        extractMessages()
      }
    }
  } // test

  await scrollAndExtract()
  console.log(`Extracted ${messages.length} messages out of ${count} requested`)
  return messages.slice(-count)
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request)

  if (request.action === 'extractMessages') {
    extractMessages(request.count).then((messages) => {
      console.log('Successfully extracted messages:', {
        count: messages.length,
        sample: messages[0]?.substring(0, 100),
      })
      sendResponse({ messages })
    })
  }
  return true
})
