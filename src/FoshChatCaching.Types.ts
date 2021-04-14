export type GetUserMetadataFunc<T> = (userId: string) => Promise<T>;

export enum CacheState {
  Uncached,
  Caching,
  Cached
}

export interface UserIdCache<T> {
  userId: string;
  state: CacheState;
  metadata?: T
}
