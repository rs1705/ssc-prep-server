import { pickSection } from './mocks.service';

const item = (id: string, passageId: string | null = null) => ({
  id,
  passageId,
});

describe('pickSection', () => {
  it('picks exactly the requested number when singles allow it', () => {
    const items = Array.from({ length: 40 }, (_, i) => item(`q${i}`));
    const out = pickSection(items, 25);
    expect(out).toHaveLength(25);
    expect(new Set(out.map((q) => q.id)).size).toBe(25);
  });

  it('keeps a passage group whole and together', () => {
    const items = [
      ...Array.from({ length: 5 }, (_, i) => item(`p${i}`, 'P')),
      ...Array.from({ length: 30 }, (_, i) => item(`s${i}`)),
    ];
    for (let run = 0; run < 20; run++) {
      const out = pickSection(items, 25);
      expect(out).toHaveLength(25);
      const idx = out
        .map((q, i) => (q.passageId === 'P' ? i : -1))
        .filter((i) => i >= 0);
      expect([0, 5]).toContain(idx.length);
      if (idx.length) expect(idx[4] - idx[0]).toBe(4);
    }
  });
});
