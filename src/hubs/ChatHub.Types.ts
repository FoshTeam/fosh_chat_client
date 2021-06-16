export interface IChatHubCallbacks {
  conversationDeleted?: (conversationDeletedData: ConversationDeletedData) => void;
  messageDeleted?: (messageDeletedData: MessageDeletedData) => void;
  markAllMessagesAsRead?: () => void;
  markConversationAsRead?: (markConversationAsReadData: MarkConversationAsReadData) => void;
  messageReceived?: (messageReceivedData: MessageReceivedData) => void;
  presenceUpdate?: (presenceUpdateData: PresenceUpdateData) => void;
  
  groupInfoUpdated?: (groupInfoUpdatedData: GroupInfoUpdatedData) => void;
  groupMessageReceived?: (groupMessageReceivedData: GroupMessageReceivedData) => void;
  
  systemMessageReceived?: (systemMessageReceivedData: SystemMessageReceivedData) => void;
}

export interface GroupMessageReceivedData
{
  groupId: string;
  senderId: string;
  message: string;
  messageTime: string;
}

export interface GroupInfoUpdatedData
{
  groupId: string;
  totalUserCount: number;
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

export interface MessageReceivedData {
  messageId: string;
  senderId: string;
  conversationId: string;
  message: string;
  messageTime: Date;
}

export interface SystemMessageReceivedData {
  sender: "System";
  type: string;
  message: string;
}

export interface PresenceUpdateData {
  userId: string;
  isOnline: boolean;
}
