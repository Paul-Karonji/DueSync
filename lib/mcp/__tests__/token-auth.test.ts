import { createRawMcpAccessToken, hashMcpAccessToken } from '../token-auth';

describe('MCP token helpers', () => {
  it('creates opaque tokens with the expected prefix', () => {
    const token = createRawMcpAccessToken();

    expect(token.startsWith('dsmcp_')).toBe(true);
    expect(token.length).toBeGreaterThan(20);
  });

  it('hashes the same token deterministically', () => {
    const token = 'dsmcp_example';

    expect(hashMcpAccessToken(token)).toBe(hashMcpAccessToken(token));
    expect(hashMcpAccessToken(token)).not.toBe(hashMcpAccessToken(`${token}_2`));
  });
});
