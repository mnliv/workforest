import * as fs from 'fs';
import * as path from 'path';

/** Thrown when a lock can't be acquired within the timeout. Mapped to exit code 3 in cli.ts. */
export class LockTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LockTimeoutError';
  }
}

export async function withLock<T>(lockPath: string, action: () => Promise<T> | T): Promise<T> {
  const start = Date.now();
  const timeout = 5000;
  const staleThreshold = 30000;

  while (Date.now() - start < timeout) {
    try {
      // Attempt to create the lock directory
      // Using mkdirSync without recursive: true to ensure atomicity
      fs.mkdirSync(lockPath);
      
      // Success!
      try {
        return await action();
      } finally {
        // Release the lock
        try {
          fs.rmdirSync(lockPath);
        } catch (e) {
          // Ignore errors on releasing
        }
      }
    } catch (err: any) {
      if (err.code === 'EEXIST') {
        // Lock exists. Check if it is stale.
        try {
          const stats = fs.statSync(lockPath);
          const mtime = stats.mtimeMs;
          if (Date.now() - mtime > staleThreshold) {
            // Stale lock. Attempt to remove it.
            // Note: This is a race condition, but the prompt says "treat it as stale, remove it, and retry".
            try {
              fs.rmdirSync(lockPath);
            } catch (e) {
              // If someone else removed it, that's fine.
            }
            await new Promise(resolve => setTimeout(resolve, 200));
            continue;
          }
        } catch (e) {
          // Stat failed, maybe it was removed already.
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        // Unexpected error
        throw err;
      }
    }
  }

  throw new LockTimeoutError(`Timeout acquiring lock: ${lockPath}`);
}
