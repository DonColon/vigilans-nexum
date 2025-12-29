export interface PoolFactory<T> {
  /**
   * Create a new instance
   */
  create(): T;

  /**
   * Optional: Reset Logic on Release
   */
  reset?(obj: T): void;

  /**
   * Optional: Init logic on Acquire
   */
  initialize?(obj: T): void;

  /**
   * Optional:  Validates if object is reusable
   */
  validate?(obj: T): boolean;

  /**
   * Optional:  Destroys the object permanently (Cleanup)
   */
  destroy?(obj: T): void;
}