import { describe, expect, it } from 'vitest';
import { betaDestinationForPath } from '@/lib/beta/navigation';
import { capabilityForPath, principalCanAccess, type PrincipalContext } from '@/lib/beta/principal';
const path = `/beta/analytics/channels/UC${'a'.repeat(22)}`;
describe('YouTube channel page admission', () => {
  it.each(['member', 'editor', 'admin', 'super_admin'] as const)('admits %s only with analytics read permission', role => {
    const principal: PrincipalContext = { kind: role === 'member' ? 'member' : 'operator', role, email: 'test@example.test', canonicalLanding: '/beta/chat', environment: 'production', capabilities: ['analytics:read'] };
    expect(betaDestinationForPath(path)?.href).toBe('/beta/analytics');
    expect(capabilityForPath(path)).toBe('analytics:read');
    expect(principalCanAccess(principal, path)).toBe(true);
    expect(principalCanAccess({ ...principal, capabilities: [] }, path)).toBe(false);
  });
  it.each(['/beta/analytics/channels/invalid', path + '/settings', path + 'x', '/beta/analytics/channels/'])('rejects unknown channel destination %s', invalid => {
    expect(betaDestinationForPath(invalid)).toBeNull();
    expect(capabilityForPath(invalid)).toBeNull();
  });
});
