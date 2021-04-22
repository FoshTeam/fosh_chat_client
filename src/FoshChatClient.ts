import {HttpTransportType, HubConnection, HubConnectionState, HubConnectionBuilder} from '@microsoft/signalr';
import {ChatHub} from './hubs/ChatHub';
import Config from './Config';
import {GetUserMetadataFunc} from './FoshChatCaching.Types';
import {FoshChatCaching} from './FoshChatCaching';
import {
  ConversationDeletedData,
  GetConversationIdResponse,
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
  GetConversationMessagesResponseWithUserMetadata,
  GetConversationsResponseWithUserMetadata, MessageDataWithUserMetadata
} from './FoshChatClient.Types';

export class FoshChatClient<UserMetadata> {
  readonly #eventEmitter: TypedEmitter<FoshChatClientEvents<UserMetadata>>;
  
  #connectionState: HubConnectionState;
  #caching: FoshChatCaching<UserMetadata>;
  #chatHub: ChatHub;
  
  readonly #appId: string;
  readonly #userJwt: string;
  
  constructor(appId: string, userJwt: string, getUserMetadataDelegate: GetUserMetadataFunc<UserMetadata>) {
    this.#connectionState = HubConnectionState.Disconnected;
    this.#caching = new FoshChatCaching<UserMetadata>(getUserMetadataDelegate);
    this.#chatHub = new ChatHub();
    this.#eventEmitter = new EventEmitter() as TypedEmitter<FoshChatClientEvents<UserMetadata>>;
    
    this.#appId = appId;
    this.#userJwt = userJwt;
  
    this.#chatHub.Connection = new HubConnectionBuilder()
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
  
    this.#chatHub.registerCallbacks({
      presenceUpdate: this.onPresenceUpdate,
      messageRecieved: this.onMessageReceived,
      messageDeleted: this.onMessageDeleted,
      markConversationAsRead: this.onMarkConversationAsRead,
      markAllMessagesAsRead: this.onMarkAllMessagesAsRead,
      conversationDeleted: this.onConversationDeleted
    });
  }
  
  // Public Methods
  async Connect() {
    this.#connectionState = HubConnectionState.Connecting;
    this.#eventEmitter.emit('connectionStateChanged', this.#connectionState);
    try {
      await this.Connection.start();
      this.#connectionState = HubConnectionState.Connected;
      this.#eventEmitter.emit('connectionStateChanged', this.#connectionState);
    } catch (e) {
      this.#connectionState = HubConnectionState.Disconnected;
      this.#eventEmitter.emit('connectionStateChanged', this.#connectionState);
      console.log(e);
    }
  }
  
  async Disconnect() {
    this.#connectionState = HubConnectionState.Disconnecting;
    this.#eventEmitter.emit('connectionStateChanged', this.#connectionState);
    await this.Connection.stop();
    this.#connectionState = HubConnectionState.Disconnected;
    this.#eventEmitter.emit('connectionStateChanged', this.#connectionState);
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
  
  async getConversations(conversationUpdatedAt: Date): Promise<GetConversationsResponseWithUserMetadata<UserMetadata>> {
    const result: GetConversationsResponse = await this.Connection.invoke('GetConversations', conversationUpdatedAt);
    
    let allIds = result.conversations.reduce<string[]>((all, cur) => {
      cur.userIds.forEach(userId => {
        if( all.indexOf(userId) === 0 ) {
          all = [...all, userId];
        }
      });
      
      return all;
    }, []);
    
    await this.#caching.checkCacheForUserIds(allIds);
    
    const convertedConversations = result.conversations.map<ConversationWithUserMetadata<UserMetadata>>(conversation => {
      const userIdsWithUserMetadatas = conversation.userIds.map<ConversationUserIdWithUserMetadata<UserMetadata>>((userId) => {
        const metadata = this.#caching.getUserMetadataFromCache(userId);
        
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
  
  async getConversationMessages(conversationId: string, lastMessageTimestamp: Date): Promise<GetConversationMessagesResponseWithUserMetadata<UserMetadata>> {
    const result: GetConversationMessagesResponse = await this.Connection.invoke('GetConversationMessages', conversationId, lastMessageTimestamp);
  
    let allIds = result.messages.reduce<string[]>((all, cur) => {
      if( all.indexOf(cur.senderUserId) === 0 ) {
        all = [...all, cur.senderUserId];
      }
      
      return all;
    }, []);
  
    await this.#caching.checkCacheForUserIds(allIds);
  
    const convertedMessages = result.messages.map<MessageDataWithUserMetadata<UserMetadata>>(message => {
      const metadata = this.#caching.getUserMetadataFromCache(message.senderUserId);
    
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
  
  async getConversationId(otherUserId: string): Promise<GetConversationIdResponse> {
    return await this.Connection.invoke('GetConversationId', otherUserId);
  }
  
  async subscribeToPresence(otherUserId: string[]): Promise<void> {
    return await this.Connection.invoke('SubscribeToPresence', otherUserId);
  }
  
  async unsubscribeFromPresence(otherUserId: string[]): Promise<void> {
    return await this.Connection.invoke('UnsubscribeFromPresence', otherUserId);
  }
  
  
  // Event Handlers
  private async onPresenceUpdate(presenceUpdateData: PresenceUpdateData) {
    await this.#caching.checkCacheForUserIds([presenceUpdateData.userId]);
    const userMetadata = this.#caching.getUserMetadataFromCache(presenceUpdateData.userId);
    
    this.#eventEmitter.emit('presenceUpdate', {
      ...presenceUpdateData,
      user: userMetadata
    });
  }
  
  private async onMessageReceived(messageRecievedData: MessageRecievedData) {
    await this.#caching.checkCacheForUserIds([messageRecievedData.senderId]);
    const userMetadata = this.#caching.getUserMetadataFromCache(messageRecievedData.senderId);
    
    this.#eventEmitter.emit('messageReceived', {
      ...messageRecievedData,
      user: userMetadata
    });
  }
  
  private onMessageDeleted(messageDeletedData: MessageDeletedData) {
    this.#eventEmitter.emit('messageDeleted', messageDeletedData);
  }
  
  private onMarkConversationAsRead(markConversationAsReadData: MarkConversationAsReadData) {
    this.#eventEmitter.emit('markConversationAsRead', markConversationAsReadData);
  }
  
  private onMarkAllMessagesAsRead() {
    this.#eventEmitter.emit('markAllMessagesAsRead');
  }
  
  private onConversationDeleted(conversationDeletedData: ConversationDeletedData) {
    this.#eventEmitter.emit('conversationDeleted', conversationDeletedData);
  }
  
  
  // Getters
  get ConnectionState(): HubConnectionState {
    return this.#connectionState;
  }
  
  get Events(): TypedEmitter<FoshChatClientEvents<UserMetadata>> {
    return this.#eventEmitter;
  }
  
  get Connection(): HubConnection {
    return this.#chatHub.Connection;
  }
  
  // Internal
  private onReconnected() {
    this.#connectionState = HubConnectionState.Connected;
    this.#eventEmitter.emit('connectionStateChanged', this.#connectionState);
  }
  
  private onReconnecting() {
    this.#connectionState = HubConnectionState.Reconnecting;
    this.#eventEmitter.emit('connectionStateChanged', this.#connectionState);
  }
  
  private onClose() {
    this.#connectionState = HubConnectionState.Disconnected;
    this.#eventEmitter.emit('connectionStateChanged', this.#connectionState);
  }
}
