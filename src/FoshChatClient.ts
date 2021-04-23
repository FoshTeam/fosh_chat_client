import {HttpTransportType, HubConnection, HubConnectionState, HubConnectionBuilder} from '@microsoft/signalr';
import {ChatHub} from './hubs/ChatHub';
import Config from './Config';
import {GetUserMetadataFunc} from './FoshChatCaching.Types';
import {FoshChatCaching} from './FoshChatCaching';
import {
  ConversationDeletedData,
  GetConversationResponse,
  GetConversationMessagesResponse,
  GetConversationsResponse,
  MarkConversationAsReadData,
  MessageDeletedData,
  MessageRecievedData,
  PresenceUpdateData
} from './hubs/ChatHub.Types';
import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';
import {
  ConversationUserIdWithUserMetadata,
  ConversationWithUserMetadata, FoshChatClientEvents,
  GetConversationMessagesResponseWithUserMetadata, GetConversationResponseWithUserMetadata,
  GetConversationsResponseWithUserMetadata, MessageDataWithUserMetadata
} from './FoshChatClient.Types';

export class FoshChatClient<UserMetadata> {
  readonly eventEmitter: TypedEmitter<FoshChatClientEvents<UserMetadata>>;
  
  connectionState: HubConnectionState;
  caching: FoshChatCaching<UserMetadata>;
  chatHub: ChatHub;
  
  readonly #appId: string;
  readonly #userJwt: string;
  
  constructor(appId: string, userJwt: string, getUserMetadataDelegate: GetUserMetadataFunc<UserMetadata>) {
    this.connectionState = HubConnectionState.Disconnected;
    this.caching = new FoshChatCaching<UserMetadata>(getUserMetadataDelegate);
    this.chatHub = new ChatHub();
    this.eventEmitter = new EventEmitter() as TypedEmitter<FoshChatClientEvents<UserMetadata>>;
    
    this.#appId = appId;
    this.#userJwt = userJwt;
  
    this.chatHub.Connection = new HubConnectionBuilder()
      .withUrl(`${Config.ConnectionUrl}?appId=${this.#appId}`, {
        accessTokenFactory: () => this.#userJwt,
        transport: HttpTransportType.WebSockets,
        skipNegotiation: true,
        withCredentials: false
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: () => 2500
      })
      .build();
  
    this.Connection.onreconnected(this.onReconnected.bind(this));
    this.Connection.onreconnecting(this.onReconnecting.bind(this));
    this.Connection.onclose(this.onClose.bind(this));
  
    this.chatHub.registerCallbacks({
      presenceUpdate: this.onPresenceUpdate.bind(this),
      messageRecieved: this.onMessageReceived.bind(this),
      messageDeleted: this.onMessageDeleted.bind(this),
      markConversationAsRead: this.onMarkConversationAsRead.bind(this),
      markAllMessagesAsRead: this.onMarkAllMessagesAsRead.bind(this),
      conversationDeleted: this.onConversationDeleted.bind(this)
    });
    
    this.Connect = this.Connect.bind(this);
    this.Disconnect = this.Disconnect.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.deleteConversation = this.deleteConversation.bind(this);
    this.markConversationAsRead = this.markConversationAsRead.bind(this);
    this.deleteMessage = this.deleteMessage.bind(this);
    this.getConversations = this.getConversations.bind(this);
    this.getConversationMessages = this.getConversationMessages.bind(this);
    this.getConversation = this.getConversation.bind(this);
    this.subscribeToPresence = this.subscribeToPresence.bind(this);
    this.unsubscribeFromPresence = this.unsubscribeFromPresence.bind(this);
  }
  
  // Public Methods
  async Connect() {
    this.connectionState = HubConnectionState.Connecting;
    this.eventEmitter.emit('connectionStateChanged', this.connectionState);
    try {
      await this.Connection.start();
      this.connectionState = HubConnectionState.Connected;
      this.eventEmitter.emit('connectionStateChanged', this.connectionState);
    } catch (e) {
      this.connectionState = HubConnectionState.Disconnected;
      this.eventEmitter.emit('connectionStateChanged', this.connectionState);
      console.log(e);
    }
  }
  
  async Disconnect() {
    this.connectionState = HubConnectionState.Disconnecting;
    this.eventEmitter.emit('connectionStateChanged', this.connectionState);
    await this.Connection.stop();
    this.connectionState = HubConnectionState.Disconnected;
    this.eventEmitter.emit('connectionStateChanged', this.connectionState);
  }
  
  async sendMessage(conversationId: string, message: string): Promise<void> {
    return await this.Connection.invoke('SendMessage', conversationId, message);
  }
  
  async deleteConversation(conversationId: string): Promise<void> {
    return await this.Connection.invoke('DeleteConversation', conversationId);
  }
  
  async markConversationAsRead(conversationId: string): Promise<void> {
    return await this.Connection.invoke('MarkConversationAsRead', conversationId);
  }
  
  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    return await this.Connection.invoke('DeleteMessage', conversationId, messageId);
  }
  
  async markAllMessagesAsRead(): Promise<void> {
    return await this.Connection.invoke('MarkAllMessagesAsRead');
  }
  
  async getConversations(conversationUpdatedAt?: Date): Promise<GetConversationsResponseWithUserMetadata<UserMetadata>> {
    const result: GetConversationsResponse = await this.Connection.invoke('GetConversations', conversationUpdatedAt ?? null);
    
    let allIds = result.conversations.reduce<string[]>((all, cur) => {
      cur.userIds.forEach(userId => {
        if( all.indexOf(userId) === 0 ) {
          all = [...all, userId];
        }
      });
      
      return all;
    }, []);
    
    await this.caching.checkCacheForUserIds(allIds);
    
    const convertedConversations = result.conversations.map<ConversationWithUserMetadata<UserMetadata>>(conversation => {
      const userIdsWithUserMetadatas = conversation.userIds.map<ConversationUserIdWithUserMetadata<UserMetadata>>((userId) => {
        const metadata = this.caching.getUserMetadataFromCache(userId);
        
        return {
          userId,
          user: metadata
        }
      });
      
      return {
        conversationId: conversation.conversationId,
        createdAt: conversation.createdAt,
        lastMessage: conversation.lastMessage,
        unreadMessageCount: conversation.unreadMessageCount,
        updatedAt: conversation.updatedAt,
        userIds: userIdsWithUserMetadatas
      }
    });
    
    return {
      isMoreConversationsAvailable: result.isMoreConversationsAvailable,
      conversations: convertedConversations
    }
  }
  
  async getConversationMessages(conversationId: string, lastMessageTimestamp?: Date): Promise<GetConversationMessagesResponseWithUserMetadata<UserMetadata>> {
    const result: GetConversationMessagesResponse = await this.Connection.invoke('GetConversationMessages', conversationId, lastMessageTimestamp ?? null);
  
    let allIds = result.messages.reduce<string[]>((all, cur) => {
      if( all.indexOf(cur.senderUserId) === 0 ) {
        all = [...all, cur.senderUserId];
      }
      
      return all;
    }, []);
  
    await this.caching.checkCacheForUserIds(allIds);
  
    const convertedMessages = result.messages.map<MessageDataWithUserMetadata<UserMetadata>>(message => {
      const metadata = this.caching.getUserMetadataFromCache(message.senderUserId);
    
      return {
        ...message,
        user: metadata
      };
    });
    
    return {
      ...result,
      messages: convertedMessages
    }
  }
  
  async getConversation(otherUserId: string): Promise<GetConversationResponseWithUserMetadata<UserMetadata>> {
    const result: GetConversationResponse = await this.Connection.invoke('GetConversation', otherUserId);
  
    await this.caching.checkCacheForUserIds(result.conversation.userIds);
    
    const newUserIds = result.conversation.userIds.map<ConversationUserIdWithUserMetadata<UserMetadata>>((userId) => {
      const metadata = this.caching.getUserMetadataFromCache(userId);
      
      return {
        userId,
        user: metadata
      };
    });
    
    return {
      conversation: {
        ...result.conversation,
        userIds: newUserIds
      }
    };
  }
  
  async subscribeToPresence(otherUserId: string[]): Promise<void> {
    return await this.Connection.invoke('SubscribeToPresence', otherUserId);
  }
  
  async unsubscribeFromPresence(otherUserId: string[]): Promise<void> {
    return await this.Connection.invoke('UnsubscribeFromPresence', otherUserId);
  }
  
  
  // Event Handlers
  private async onPresenceUpdate(presenceUpdateData: PresenceUpdateData) {
    await this.caching.checkCacheForUserIds([presenceUpdateData.userId]);
    const userMetadata = this.caching.getUserMetadataFromCache(presenceUpdateData.userId);
    
    this.eventEmitter.emit('presenceUpdate', {
      ...presenceUpdateData,
      user: userMetadata
    });
  }
  
  private async onMessageReceived(messageRecievedData: MessageRecievedData) {
    console.log(this);
    console.log(this.caching);
    await this.caching.checkCacheForUserIds([messageRecievedData.senderId]);
    const userMetadata = this.caching.getUserMetadataFromCache(messageRecievedData.senderId);
    
    this.eventEmitter.emit('messageReceived', {
      ...messageRecievedData,
      user: userMetadata
    });
  }
  
  private onMessageDeleted(messageDeletedData: MessageDeletedData) {
    this.eventEmitter.emit('messageDeleted', messageDeletedData);
  }
  
  private onMarkConversationAsRead(markConversationAsReadData: MarkConversationAsReadData) {
    this.eventEmitter.emit('markConversationAsRead', markConversationAsReadData);
  }
  
  private onMarkAllMessagesAsRead() {
    this.eventEmitter.emit('markAllMessagesAsRead');
  }
  
  private onConversationDeleted(conversationDeletedData: ConversationDeletedData) {
    this.eventEmitter.emit('conversationDeleted', conversationDeletedData);
  }
  
  
  // Getters
  get ConnectionState(): HubConnectionState {
    return this.connectionState;
  }
  
  get Events(): TypedEmitter<FoshChatClientEvents<UserMetadata>> {
    return this.eventEmitter;
  }
  
  get Connection(): HubConnection {
    return this.chatHub.Connection;
  }
  
  // Internal
  private onReconnected() {
    this.connectionState = HubConnectionState.Connected;
    this.eventEmitter.emit('connectionStateChanged', this.connectionState);
  }
  
  private onReconnecting() {
    this.connectionState = HubConnectionState.Reconnecting;
    this.eventEmitter.emit('connectionStateChanged', this.connectionState);
  }
  
  private onClose() {
    this.connectionState = HubConnectionState.Disconnected;
    this.eventEmitter.emit('connectionStateChanged', this.connectionState);
  }
}
