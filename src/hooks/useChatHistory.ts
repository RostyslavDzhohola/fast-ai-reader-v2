import { useEffect, useCallback } from 'react'
import { ExtendedMessage } from '../types/chat'

const logPrefix = '[useChatHistory]'

export const useChatHistory = (
  aiMessages: ExtendedMessage[],
  setMessages: (
    messages: ExtendedMessage[] | ((messages: ExtendedMessage[]) => ExtendedMessage[]),
  ) => void,
) => {
  // Load chat history
  const loadChatHistory = useCallback(() => {
    chrome.storage.local.get('aiMessages').then((result) => {
      if (result.aiMessages) {
        // console.log(`${logPrefix} Loading ${result.aiMessages.length} messages from storage`)
        setMessages(result.aiMessages)
      }
    })
  }, [setMessages])

  // Save chat history whenever messages change
  useEffect(() => {
    if (aiMessages.length > 0) {
      chrome.storage.local.set({ aiMessages }).then(() => {
        // console.log(`${logPrefix} Saved ${aiMessages.length} messages to storage`, {
        //   lastMessage: aiMessages[aiMessages.length - 1],
        // })
      })
    }
  }, [aiMessages])

  return { loadChatHistory }
}

export default useChatHistory
