import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import TasteSensoryMeter from './TasteSensoryMeter';

describe('TasteSensoryMeter', () => {
  it('renders the saved scores as accessible five-dot metrics', () => {
    const html = renderToStaticMarkup(createElement(TasteSensoryMeter, { spiciness: 3, chewiness: 4, aroma: 5 }));

    expect(html.match(/aria-label="3\/5"/g)).toHaveLength(1);
    expect(html.match(/aria-label="4\/5"/g)).toHaveLength(1);
    expect(html.match(/aria-label="5\/5"/g)).toHaveLength(1);
    expect(html.match(/class="is-filled"/g)).toHaveLength(12);
  });

  it('hides the sensory meter when persisted scores are missing', () => {
    expect(renderToStaticMarkup(createElement(TasteSensoryMeter, {}))).toBe('');
  });
});