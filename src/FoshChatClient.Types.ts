import {
  Conversation, ConversationDeletedData,
  GetConversationMessagesResponse, GetConversationResponse,
  GetConversationsResponse, MarkConversationAsReadData,
  MessageData, MessageDeletedData,
  MessageRecievedData,
  PresenceUpdateData
} from './hubs/ChatHub.Types';
import {HubConnectionState} from '@microsoft/signalr';

export interface ExtendWithUserMetadata<UserMetadata> {
  user: UserMetadata | null;
}

export interface GetConversationsResponseWithUserMetadata<UserMetadata> extends Omit<GetConversationsResponse, 'conversations'> {
  conversations: ConversationWithUserMetadata<UserMetadata>[];
}

export interface GetConversationResponseWithUserMetadata<UserMetadata> extends Omit<GetConversationResponse, 'conversation'> {
  conversation: ConversationWithUserMetadata<UserMetadata>;
}

export interface GetConversationMessagesResponseWithUserMetadata<UserMetadata> extends GetConversationMessagesResponse {
  messages: MessageDataWithUserMetadata<UserMetadata>[];
}

export interface ConversationWithUserMetadata<UserMetadata> extends Omit<Conversation, 'userIds'> {
  userIds: ConversationUserIdWithUserMetadata<UserMetadata>[];
}

export interface ConversationUserIdWithUserMetadata<UserMetadata> {
  userId: string;
  user: UserMetadata | null;
}

export interface PresenceUpdateDataWithUserMetadata<UserMetadata> extends PresenceUpdateData, ExtendWithUserMetadata<UserMetadata> {}
export interface MessageRecievedDataWithUserMetadata<UserMetadata> extends MessageRecievedData, ExtendWithUserMetadata<UserMetadata> {}
export interface MessageDataWithUserMetadata<UserMetadata> extends MessageData, ExtendWithUserMetadata<UserMetadata> {}

export interface FoshChatClientEvents<UserMetadata> {
  presenceUpdate: (presenceUpdateData: PresenceUpdateDataWithUserMetadata<UserMetadata>) => void,
  messageReceived: (messageRecievedData: MessageRecievedDataWithUserMetadata<UserMetadata>) => void;
  messageDeleted: (messageDeletedData: MessageDeletedData) => void;
  markConversationAsRead: (markConversationAsReadData: MarkConversationAsReadData) => void;
  markAllMessagesAsRead: () => void;
  conversationDeleted: (conversationDeletedData: ConversationDeletedData) => void;
  connectionStateChanged: (newState: HubConnectionState) => void;
}
