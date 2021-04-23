import {CacheState, GetUserMetadataFunc, UserIdCache} from './FoshChatCaching.Types';

export class FoshChatCaching<UserMetadata> {
  userCaches: UserIdCache<UserMetadata>[];
  
  readonly getUserMetadataDelegate?: GetUserMetadataFunc<UserMetadata>;
  
  constructor(getUserMetadataDelegate?: GetUserMetadataFunc<UserMetadata>) {
    this.userCaches = [];
    this.getUserMetadataDelegate = getUserMetadataDelegate;
  }
  
  async checkCacheForUserIds(userIds: string[]) {
    console.log('Checking cache for user ids: ', userIds);
    
    const nonCachedUserIds = userIds.filter(userId => {
      return !this.userCaches.some(cachedUserId => {
        console.log(`UserId(${userId}) === cachedUserId.userId(${cachedUserId.userId})`, cachedUserId)
        return userId === cachedUserId.userId;
      });
    }).map<UserIdCache<UserMetadata>>(userId => {
      const returns = {
        userId,
        state: CacheState.Uncached
      };
      console.log(`Mapping: ${userId} and returning: `, returns);
      
      return returns;
    });
    
    this.userCaches = [...nonCachedUserIds, ...this.userCaches];
    console.log('New user caches: ', this.userCaches);
    await this.fetchUserMetadatas();
  }
  
  async fetchUserMetadatas(): Promise<boolean> {
    if (this.getUserMetadataDelegate == null) {
      return false;
    }
    
    const uncachedUsers = this.userCaches.filter(cache => cache.state === CacheState.Uncached);
    
    console.log('Uncached users: ', uncachedUsers);
    
    if (uncachedUsers.length === 0) {
      return false;
    }
    
    const asyncActions = [];
    const asyncActionsIds = [];
    
    for (let uncachedUser of uncachedUsers) {
      uncachedUser.state = CacheState.Caching;
      asyncActionsIds.push(uncachedUser.userId);
      asyncActions.push(this.getUserMetadataDelegate(uncachedUser.userId).catch(_ => {
          uncachedUser.state = CacheState.Uncached;
          return null;
      }));
    }
    
    const results = await Promise.all(asyncActions);
    
    if(results.length > 0) {
      results.forEach((user, index) => {
        const uncachedUser = uncachedUsers[index];
        
        if(uncachedUser != null) {
          uncachedUser.state = typeof user != null ? CacheState.Cached : CacheState.Uncached;
        }
      })
    }
    
    return true;
  }
  
  getUserMetadataFromCache(userId: string): UserMetadata | null {
    const foundUser = this.userCaches.find(metadata => metadata.userId === userId && metadata.state === CacheState.Cached);
    
    console.log(foundUser);
    
    if (!foundUser) {
      return null;
    }
    
    return foundUser.metadata ?? null;
  }
}
