import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import TasteSensoryMeter from './TasteSensoryMeter';

describe('TasteSensoryMeter', () => {
  it('renders the saved scores as accessible progress bars with percentages', () => {
    const html = renderToStaticMarkup(createElement(TasteSensoryMeter, { spiciness: 3, chewiness: 4, aroma: 5 }));

    expect(html.match(/role="progressbar"/g)).toHaveLength(3);
    expect(html.match(/aria-valuenow="3"/g)).toHaveLength(1);
    expect(html.match(/aria-valuenow="4"/g)).toHaveLength(1);
    expect(html.match(/aria-valuenow="5"/g)).toHaveLength(1);
    expect(html).toContain('>60%</span>');
    expect(html).toContain('>80%</span>');
    expect(html).toContain('>100%</span>');
  });

  it('hides the sensory meter when persisted scores are missing', () => {
    expect(renderToStaticMarkup(createElement(TasteSensoryMeter, {}))).toBe('');
  });
});