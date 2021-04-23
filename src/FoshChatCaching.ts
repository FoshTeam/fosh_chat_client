import {CacheState, GetUserMetadataFunc, UserIdCache} from './FoshChatCaching.Types';

export class FoshChatCaching<UserMetadata> {
  userCaches: UserIdCache<UserMetadata>[];
  
  readonly getUserMetadataDelegate?: GetUserMetadataFunc<UserMetadata>;
  
  constructor(getUserMetadataDelegate?: GetUserMetadataFunc<UserMetadata>) {
    this.userCaches = [];
    this.getUserMetadataDelegate = getUserMetadataDelegate;
  }
  
  async checkCacheForUserIds(userIds: string[]) {
    const nonCachedUserIds = userIds.filter(userId => {
      return this.userCaches.some(cachedUserId => userId === cachedUserId.userId);
    }).map<UserIdCache<UserMetadata>>(userId => {
      return {
        userId,
        state: CacheState.Uncached
      };
    });
    
    this.userCaches = [...nonCachedUserIds, ...this.userCaches];
    await this.fetchUserMetadatas();
  }
  
  async fetchUserMetadatas(): Promise<boolean> {
    if (this.getUserMetadataDelegate == null) {
      return false;
    }
    
    const uncachedUsers = this.userCaches.filter(cache => cache.state === CacheState.Uncached);
    
    if (uncachedUsers.length === 0) {
      return false;
    }
    
    const asyncActions = [];
    
    for (let uncachedUser of uncachedUsers) {
      uncachedUser.state = CacheState.Caching;
      
      asyncActions.push(this.getUserMetadataDelegate(uncachedUser.userId).catch(_ => {
          uncachedUser.state = CacheState.Uncached;
          return null;
      }));
    }
    
    const results = await Promise.all(asyncActions);
    
    return results.length > 0;
  }
  
  getUserMetadataFromCache(userId: string): UserMetadata | null {
    const foundUser = this.userCaches.find(metadata => metadata.userId === userId && metadata.state === CacheState.Cached);
    
    if (!foundUser) {
      return null;
    }
    
    return foundUser.metadata!;
  }
}
