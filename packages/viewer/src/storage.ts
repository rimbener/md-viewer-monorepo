/**
 * Key-value storage for the preferences. `localStorage` persists in a
 * browser and in the Tauri web view alike. Every call may throw: a private
 * window or blocked site data refuses it.
 */
export const storage = {
  async getItem(key: string): Promise<string | null> {
    return window.localStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    window.localStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    window.localStorage.removeItem(key);
  },
};
