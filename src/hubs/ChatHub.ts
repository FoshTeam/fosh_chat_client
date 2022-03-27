import { HubConnection } from "@microsoft/signalr"
import {
    GetConversationResponse,
    GetConversationMessagesResponse,
    GetConversationsResponse,
    IChatHubCallbacks,
    ConversationDeletedData,
    MessageDeletedData,
    MarkConversationAsReadData,
    MessageReceivedData,
    PresenceUpdateData, GroupInfoUpdatedData, GroupMessageReceivedData, SystemMessageReceivedData
} from './ChatHub.Types.js';
import {ChatHubUtils} from './ChatHub.Utils.js';

export class ChatHub {
    connection?: HubConnection;
    
    set Connection(connection: HubConnection) {
        this.connection = connection;
    }
    
    get Connection() {
        return this.connection!;
    }

    sendMessage(conversationId: string, message: string): Promise<void> {
        return this.Connection.invoke('SendMessage', conversationId, message);
    }

    deleteConversation(conversationId: string): Promise<void> {
        return this.Connection.invoke('DeleteConversation', conversationId);
    }

    markConversationAsRead(conversationId: string): Promise<void> {
        return this.Connection.invoke('MarkConversationAsRead', conversationId);
    }

    deleteMessage(conversationId: string, messageId: string): Promise<void> {
        return this.Connection.invoke('DeleteMessage', conversationId, messageId);
    }

    markAllMessagesAsRead(): Promise<void> {
        return this.Connection.invoke('MarkAllMessagesAsRead');
    }

    getConversations(conversationUpdatedAt: Date): Promise<GetConversationsResponse> {
        return this.Connection.invoke('GetConversations', conversationUpdatedAt);
    }

    getConversation(otherUserId: string): Promise<GetConversationResponse> {
        return this.Connection.invoke('GetConversation', otherUserId);
    }

    getConversationMessages(conversationId: string, lastMessageTimestamp: Date): Promise<GetConversationMessagesResponse> {
        return this.Connection.invoke('GetConversationMessages', conversationId, lastMessageTimestamp);
    }

    subscribeToPresence(otherUserId: string[]): Promise<void> {
        return this.Connection.invoke('SubscribeToPresence', otherUserId);
    }

    unsubscribeFromPresence(otherUserId: string[]): Promise<void> {
        return this.Connection.invoke('UnsubscribeFromPresence', otherUserId);
    }
    
    addToGroup(groupId: string): Promise<void> {
        return this.Connection.invoke('AddToGroup', groupId);
    }
    
    removeFromGroup(groupId: string): Promise<void> {
        return this.Connection.invoke('RemoveFromGroup', groupId);
    }
    
    sendMessageToGroup(groupId: string, message: string): Promise<void> {
        return this.Connection.invoke('SendMessageToGroup', groupId, message);
    }
    
    conversationDeletedImplementationFn(implementation: IChatHubCallbacks, conversationDeletedData: ConversationDeletedData) {
        ChatHubUtils.CallIfFunction(implementation.conversationDeleted, conversationDeletedData);
    }
    
    messageDeletedImplementationFn(implementation: IChatHubCallbacks, messageDeletedData: MessageDeletedData) {
        ChatHubUtils.CallIfFunction(implementation.messageDeleted, messageDeletedData);
    }
    
    markAllMessagesAsReadImplementationFn(implementation: IChatHubCallbacks) {
        ChatHubUtils.CallIfFunction(implementation.markAllMessagesAsRead);
    }
    
    markConversationAsReadImplementationFn(implementation: IChatHubCallbacks, markConversationAsReadData: MarkConversationAsReadData) {
        ChatHubUtils.CallIfFunction(implementation.markConversationAsRead, markConversationAsReadData);
    }
    
    messageReceivedImplementationFn(implementation: IChatHubCallbacks, messageReceivedData: MessageReceivedData) {
        ChatHubUtils.CallIfFunction(implementation.messageReceived, messageReceivedData);
    }
    
    presenceUpdateImplementationFn(implementation: IChatHubCallbacks, presenceUpdateData: PresenceUpdateData) {
        ChatHubUtils.CallIfFunction(implementation.presenceUpdate, presenceUpdateData);
    }
    
    groupInfoUpdatedImplementationFn(implementation: IChatHubCallbacks, groupInfoUpdatedData: GroupInfoUpdatedData) {
        ChatHubUtils.CallIfFunction(implementation.groupInfoUpdated, groupInfoUpdatedData);
    }
    
    groupMessageReceivedImplementationFn(implementation: IChatHubCallbacks, groupMessageReceivedData: GroupMessageReceivedData) {
        ChatHubUtils.CallIfFunction(implementation.groupMessageReceived, groupMessageReceivedData);
    }
    
    systemMessageReceivedImplementationFn(implementation: IChatHubCallbacks, systemMessageReceivedData: SystemMessageReceivedData) {
        ChatHubUtils.CallIfFunction(implementation.systemMessageReceived, systemMessageReceivedData);
    }

    registerCallbacks(implementation: IChatHubCallbacks) {
        this.Connection.on('ConversationDeleted', this.conversationDeletedImplementationFn.bind(this, implementation));
        this.Connection.on('MessageDeleted', this.messageDeletedImplementationFn.bind(this, implementation));
        this.Connection.on('MarkAllMessagesAsRead', this.markAllMessagesAsReadImplementationFn.bind(this, implementation));
        this.Connection.on('MarkConversationAsRead', this.markConversationAsReadImplementationFn.bind(this, implementation));
        this.Connection.on('MessageReceived', this.messageReceivedImplementationFn.bind(this, implementation));
        this.Connection.on('PresenceUpdate', this.presenceUpdateImplementationFn.bind(this, implementation));
        this.Connection.on('GroupInfoUpdated', this.groupInfoUpdatedImplementationFn.bind(this, implementation));
        this.Connection.on('GroupMessageReceived', this.groupMessageReceivedImplementationFn.bind(this, implementation));
        this.Connection.on('SystemMessage', this.systemMessageReceivedImplementationFn.bind(this, implementation));
    }

    unregisterCallbacks(implementation: IChatHubCallbacks) {
        this.Connection.off('ConversationDeleted', this.conversationDeletedImplementationFn.bind(this, implementation));
        this.Connection.off('MessageDeleted', this.messageDeletedImplementationFn.bind(this, implementation));
        this.Connection.off('MarkAllMessagesAsRead', this.markAllMessagesAsReadImplementationFn.bind(this, implementation));
        this.Connection.off('MarkConversationAsRead', this.markConversationAsReadImplementationFn.bind(this, implementation));
        this.Connection.off('MessageReceived', this.messageReceivedImplementationFn.bind(this, implementation));
        this.Connection.off('PresenceUpdate', this.presenceUpdateImplementationFn.bind(this, implementation));
        this.Connection.off('GroupInfoUpdated', this.groupInfoUpdatedImplementationFn.bind(this, implementation));
        this.Connection.off('GroupMessageReceived', this.groupMessageReceivedImplementationFn.bind(this, implementation));
        this.Connection.off('SystemMessage', this.systemMessageReceivedImplementationFn.bind(this, implementation));
    }
}
