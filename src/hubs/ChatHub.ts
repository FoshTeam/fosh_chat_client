import { HubConnection } from "@microsoft/signalr"
import {
    GetConversationResponse,
    GetConversationMessagesResponse,
    GetConversationsResponse,
    IChatHubCallbacks
} from './ChatHub.Types';

export class ChatHub {
    #connection?: HubConnection;
    
    set Connection(connection: HubConnection) {
        this.#connection = connection;
    }
    
    get Connection() {
        return this.#connection!;
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

    registerCallbacks(implementation: IChatHubCallbacks) {
        this.Connection.on('ConversationDeleted', (conversationDeletedData) => implementation.conversationDeleted(conversationDeletedData));
        this.Connection.on('MessageDeleted', (messageDeletedData) => implementation.messageDeleted(messageDeletedData));
        this.Connection.on('MarkAllMessagesAsRead', () => implementation.markAllMessagesAsRead());
        this.Connection.on('MarkConversationAsRead', (markConversationAsReadData) => implementation.markConversationAsRead(markConversationAsReadData));
        this.Connection.on('MessageRecieved', (messageRecievedData) => implementation.messageRecieved(messageRecievedData));
        this.Connection.on('PresenceUpdate', (presenceUpdateData) => implementation.presenceUpdate(presenceUpdateData));
    }

    unregisterCallbacks(implementation: IChatHubCallbacks) {
        this.Connection.off('ConversationDeleted', (conversationDeletedData) => implementation.conversationDeleted(conversationDeletedData));
        this.Connection.off('MessageDeleted', (messageDeletedData) => implementation.messageDeleted(messageDeletedData));
        this.Connection.off('MarkAllMessagesAsRead', () => implementation.markAllMessagesAsRead());
        this.Connection.off('MarkConversationAsRead', (markConversationAsReadData) => implementation.markConversationAsRead(markConversationAsReadData));
        this.Connection.off('MessageRecieved', (messageRecievedData) => implementation.messageRecieved(messageRecievedData));
        this.Connection.off('PresenceUpdate', (presenceUpdateData) => implementation.presenceUpdate(presenceUpdateData));
    }
}
