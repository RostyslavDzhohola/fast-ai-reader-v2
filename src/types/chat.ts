import { Message as AIMessage } from '@ai-sdk/ui-utils'

export interface ExtendedMessage extends AIMessage {
  isExtracted?: boolean
  messageCount?: number
}
