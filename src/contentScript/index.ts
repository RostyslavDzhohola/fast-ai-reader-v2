console.log('%cContent Script Loaded', 'color: #00ff00; font-size: 20px; font-weight: bold;')

console.info('contentScript is running')

// Notify background script that content script is ready
chrome.runtime.sendMessage({ action: 'contentScriptReady' })

// Add this helper function at the top level
async function scrollToBottom() {
  try {
    // Updated selector to match Discord's current class names
    const scroller = document.querySelector(
      'div[class*="scroller"][class*="customTheme"][class*="auto"]',
    ) as HTMLElement

    if (!scroller) {
      console.error('Could not find scroller element for bottom scroll')
      return
    }

    // Smooth scroll to bottom
    scroller.style.scrollBehavior = 'smooth'
    scroller.scrollTop = scroller.scrollHeight

    // Wait for scroll to complete
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Reset scroll behavior
    scroller.style.scrollBehavior = ''

    console.log('Scrolled back to bottom')
  } catch (error) {
    console.error('Error scrolling to bottom:', error)
  }
}

// Function to extract messages from Discord
async function extractMessagesFromDiscord(count: number): Promise<string[]> {
  // Use a Map to maintain messages with timestamps as the source of truth
  const messageMap = new Map<string, { timestamp: Date; message: string }>()

  // Get chat container with more detailed error checking
  const chatContainer = document.querySelector('[class*="messagesWrapper_"]') as HTMLElement
  if (!chatContainer) {
    console.error('Chat container not found')
    return []
  }

  // Send initial progress
  chrome.runtime.sendMessage({
    action: 'extractionProgress',
    processedCount: 0,
    total: count,
  })

  // Try to find Discord's internal message list component and scroll for more messages
  async function scrollForMoreMessages(): Promise<boolean> {
    try {
      const scroller = document.querySelector(
        'div[class*="scroller"][class*="customTheme"][class*="auto"]',
      ) as HTMLElement

      if (!scroller) {
        console.error('Scroller not found')
        return false
      }

      // Get baseline message count before scrolling
      let baselineMessageCount = document.querySelectorAll('[id^="chat-messages-"]').length
      console.log(`Current baseline message count: ${baselineMessageCount}`)

      // Configure scroll parameters
      scroller.style.scrollBehavior = 'auto'
      let currentScrollTop = scroller.scrollTop
      const scrollIncrement = 2000
      const scrollDelay = 600
      let foundNewMessages = false

      // Scroll up gradually
      while (currentScrollTop > 0) {
        // Calculate and apply next scroll position
        currentScrollTop = Math.max(0, currentScrollTop - scrollIncrement)
        scroller.scrollTop = currentScrollTop
        scroller.dispatchEvent(new Event('scroll', { bubbles: true }))

        // Wait for Discord to load messages
        await new Promise((resolve) => setTimeout(resolve, scrollDelay))

        // Check for new messages
        const currentMessageCount = document.querySelectorAll('[id^="chat-messages-"]').length

        if (currentMessageCount > baselineMessageCount) {
          console.log(
            `Found new messages: ${currentMessageCount - baselineMessageCount} new messages loaded`,
          )
          baselineMessageCount = currentMessageCount
          foundNewMessages = true
        }

        // Stop if we've reached the top
        if (currentScrollTop === 0) {
          console.log('Reached the top of the scroll area')
          break
        }
      }

      // Reset scroll behavior
      scroller.style.scrollBehavior = ''
      return foundNewMessages
    } catch (error) {
      console.error('Error during scroll:', error)
      return false
    }
  }

  // Process currently visible messages and add new ones to our collection
  function processVisibleMessages(): boolean {
    console.log('Processing visible messages...')
    const messageGroups = document.querySelectorAll('[id^="chat-messages-"]')
    console.log(`Found ${messageGroups.length} message groups to process`)

    const initialSize = messageMap.size
    let newMessagesFound = 0

    messageGroups.forEach((group) => {
      const usernameElement = group.querySelector('span[id^="message-username-"]')
      const timestampElement = group.querySelector('time')
      const contentElements = group.querySelectorAll('div[id^="message-content-"]')

      if (usernameElement && timestampElement) {
        const username = usernameElement.textContent?.trim() || 'Unknown User'
        const displayTimestamp = timestampElement.textContent?.trim() || 'Unknown Time'
        const date = timestampElement.getAttribute('datetime')
        const parsedDate = date ? new Date(date) : new Date()

        contentElements.forEach((contentElement) => {
          const content = contentElement.textContent?.trim() || ''
          if (content) {
            const formattedMessage = `${username} | ${displayTimestamp}\n${content}\n`
            const messageKey = `${parsedDate.getTime()}-${username}-${content}` // Unique key for deduplication

            if (!messageMap.has(messageKey)) {
              messageMap.set(messageKey, {
                timestamp: parsedDate,
                message: formattedMessage,
              })
              newMessagesFound++

              // Log milestone for every 25 messages
              if (messageMap.size % 25 === 0) {
                console.log(
                  `%cMilestone: ${messageMap.size} unique messages collected (${Math.round((messageMap.size / count) * 100)}% complete)`,
                  'color: #00ff00; font-weight: bold;',
                )
              }
            }
          }
        })
      }
    })

    if (newMessagesFound > 0) {
      console.log(
        `%cAdded ${newMessagesFound} new messages (Total: ${messageMap.size})`,
        'color: #00ffff; font-weight: bold;',
      )
    }

    // Send progress update
    chrome.runtime.sendMessage({
      action: 'extractionProgress',
      processedCount: Math.min(messageMap.size, count),
      total: count,
    })

    return messageMap.size > initialSize
  }

  // Main extraction workflow
  processVisibleMessages()

  const maxAttempts = 20
  let attempts = 0

  while (messageMap.size < count && attempts < maxAttempts) {
    console.log(
      `Attempt ${attempts + 1}/${maxAttempts} - Current messages: ${messageMap.size}/${count}`,
    )

    const foundNewMessages = await scrollForMoreMessages()
    if (!foundNewMessages) {
      console.log('No new messages found during scroll')
      attempts++

      if (attempts >= maxAttempts) {
        console.log('Reached maximum attempts, stopping extraction')
        break
      }

      await new Promise((resolve) => setTimeout(resolve, 2000))
      continue
    }

    const processedNewMessages = processVisibleMessages()
    if (!processedNewMessages) {
      console.log('No new messages found during processing')
      attempts++
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  // Convert final map to array, sort by timestamp, and return requested count
  const sortedMessages = Array.from(messageMap.values())
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    .map(({ message }) => message)

  // Send final progress update
  chrome.runtime.sendMessage({
    action: 'extractionProgress',
    processedCount: Math.min(sortedMessages.length, count),
    total: count,
  })

  // Scroll back to bottom before returning
  await scrollToBottom()

  return sortedMessages.slice(-count)
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request)

  if (request.action === 'extractMessages') {
    // Create a promise to handle the extraction
    const extractionPromise = extractMessagesFromDiscord(request.count)
      .then((messages) => {
        console.log('Successfully extracted messages:', {
          count: messages.length,
          sample: messages[0]?.substring(0, 100),
        })
        return { messages }
      })
      .catch((error) => {
        console.error('Error extracting messages:', error)
        return { error: error.message }
      })

    // Keep the message channel open
    extractionPromise.then(sendResponse)
    return true
  }

  if (request.action === 'find_username') {
    try {
      console.log('%cSearching for username', 'color: #ff00ff; font-size: 16px;')

      // First attempt: Try to clear existing search
      // Look for the 'X' button in the search bar to clear any existing search
      const clearButton = document.querySelector('.iconContainer_fea832')
      if (clearButton) {
        console.log('Found clear button, clicking it')
        ;(clearButton as HTMLElement).click()

        // Wait a bit for the clear animation to complete
        setTimeout(() => {
          // Find Discord's search bar and its DraftEditor (rich text input)
          // DraftEditor is React's rich text editor that Discord uses
          const editorContent = document.querySelector(
            'div[class*="searchBar_"] div[class*="DraftEditor-content"]',
          ) as HTMLElement
          if (!editorContent) {
            console.error('Editor content not found')
            return
          }

          // Set focus to the editor so it's ready to receive input
          // This shows the blinking cursor in the search field
          editorContent.focus()

          // Create a clipboard event to simulate pasting text
          // This works better than directly setting textContent
          const clipboardData = new DataTransfer()
          clipboardData.setData('text/plain', `from: ${request.username}`)

          // Create and dispatch a paste event
          // bubbles: true allows Discord to detect the change
          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData,
          })

          // Trigger the paste event on the editor
          editorContent.dispatchEvent(pasteEvent)

          // Wait for Discord to process the search and show results
          setTimeout(() => {
            // First try to find and click the first result
            // Discord shows results with this class when there's a direct match
            const firstResult = document.querySelector('div[class*="content_b0286e"]')
            if (firstResult) {
              console.log('Found first result, clicking it')
              ;(firstResult as HTMLElement).click()
            } else {
              // If no direct result, check for return button
              const returnButton = document.querySelector('span[class*="key_"]')
              if (returnButton) {
                console.log('Found return button, simulating Enter key')
                editorContent.dispatchEvent(
                  new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                  }),
                )
              } else {
                console.error('Neither result nor return button found')
              }
            }
          }, 201) // Give Discord time to show search results

          console.log('Successfully set search text:', request.username)
        }, 100)
      } else {
        console.log('No clear button found, proceeding with search')
        // ... rest of the existing search code ...
      }
    } catch (error) {
      console.error('%cError in username search:', 'color: red; font-size: 16px;', error)
    }
  }

  return true
})
