/** Narrow server-only provider operation. Never forward provider bodies to clients. */
export function createClerkUserDeleter(secret: unknown, fetcher: typeof fetch = fetch) {
  if (typeof secret !== "string" || secret.trim().length < 8) return undefined;
  return async (email: string): Promise<boolean> => {
    try {
      const headers = { authorization: `Bearer ${secret.trim()}` };
      const url = new URL("https://api.clerk.com/v1/users");
      url.searchParams.append("email_address", email);
      const response = await fetcher(url, { headers });
      if (!response.ok) return false;
      const users: unknown = await response.json();
      if (!Array.isArray(users)) return false;
      // Fail closed if the provider doesn't return the exact unique email match.
      if (users.length === 0) return true;
      if (users.length !== 1) return false;
      const user = users[0];
      if (!user || typeof user.id !== "string" || !/^user_[A-Za-z0-9_-]+$/.test(user.id)
        || !Array.isArray(user.email_addresses)
        || !user.email_addresses.some((item: { email_address?: unknown }) => typeof item?.email_address === "string" && item.email_address.toLowerCase() === email)) return false;
      const deleted = await fetcher(`https://api.clerk.com/v1/users/${encodeURIComponent(user.id)}`, { method: "DELETE", headers });
      return deleted.ok || deleted.status === 404;
    } catch { return false; }
  };
}
