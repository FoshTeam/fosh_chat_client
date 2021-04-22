export interface IChatHubCallbacks {
  conversationDeleted(conversationDeletedData: ConversationDeletedData): void;
  messageDeleted(messageDeletedData: MessageDeletedData): void;
  markAllMessagesAsRead(): void;
  markConversationAsRead(markConversationAsReadData: MarkConversationAsReadData): void;
  messageRecieved(messageRecievedData: MessageRecievedData): void;
  presenceUpdate(presenceUpdateData: PresenceUpdateData): void;
}

export interface GetConversationsResponse {
  isMoreConversationsAvailable: boolean;
  conversations: Conversation[];
}

export interface Conversation {
  conversationId: string;
  userIds: string[];
  unreadMessageCount: number;
  lastMessage: MessageData | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageData {
  messageId: string;
  message: string;
  senderUserId: string;
  sentAt: Date;
}

export interface GetConversationResponse {
  conversation: Conversation;
}

export interface GetConversationMessagesResponse {
  isMoreMessagesAvailable: boolean;
  conversationId: string;
  messages: MessageData[];
}

export interface ConversationDeletedData {
  conversationId: string;
}

export interface MessageDeletedData {
  conversationId: string;
  messageId: string;
}

export interface MarkConversationAsReadData {
  conversationId: string;
}

export interface MessageRecievedData {
  messageId: string;
  senderId: string;
  conversationId: string;
  message: string;
  messageTime: Date;
}

export interface PresenceUpdateData {
  userId: string;
  isOnline: boolean;
}
