import { describe, it, expect } from 'vitest';
import { isForbiddenSource, validateRefsFile } from '../../../tools/lib/refs/policy';

describe('política de referencias (REF-2)', () => {
  it.each([
    'https://maps.google.com/maps?q=uap',
    'https://www.google.com/maps/place/UAP',
    'https://www.google.com.ar/maps/@-32,-60',
    'https://lh5.googleusercontent.com/p/AF1QipNabc=w400',
    'https://lh3.ggpht.com/abc',
    'https://streetviewpixels-pa.googleapis.com/v1/thumbnail?panoid=x',
    'https://earth.google.com/web/@-32',
    'https://maps.googleapis.com/maps/api/staticmap?center=x',
    'https://geo0.ggpht.com/cbk?panoid=1',
  ])('REF-2: rechaza %s', (url) => {
    expect(isForbiddenSource(url)).toBe(true);
  });

  it.each([
    'https://upload.wikimedia.org/wikipedia/commons/a/ab/UAP.jpg',
    'https://www.uap.edu.ar/wp-content/uploads/biblioteca.jpg',
    'https://www.flickr.com/photos/x/123',
  ])('REF-2: acepta %s', (url) => {
    expect(isForbiddenSource(url)).toBe(false);
  });

  it('REF-1: valida campos obligatorios y reporta URLs prohibidas', () => {
    const problems = validateRefsFile({
      osmId: 'way/1', name: 'X',
      refs: [
        { file: 'a.jpg', imageUrl: 'https://maps.google.com/x', sourcePageUrl: 'https://maps.google.com', accessedAt: '2026-11-26', extracted: [] },
        { file: 'b.jpg', imageUrl: 'https://uap.edu.ar/b.jpg', accessedAt: '2026-11-26', extracted: ['2 pisos'] },
      ],
    });
    expect(problems.some((p) => p.includes('prohibida'))).toBe(true);
    expect(problems.some((p) => p.includes('sourcePageUrl'))).toBe(true);
  });
});
