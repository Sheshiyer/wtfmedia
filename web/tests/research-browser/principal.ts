// Network responses are controlled by Playwright. Admission itself is outside this UI test.
const fetcher = (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init);
export const useMemberFetch = () => fetcher;
export const useBetaPrincipal = () => ({ capabilities: ["research:read", "research:write"] });
