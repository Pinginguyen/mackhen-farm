import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import TasteSensoryMeter from './TasteSensoryMeter';

describe('TasteSensoryMeter', () => {
  it('renders the saved scores as accessible progress bars with percentages', () => {
    const html = renderToStaticMarkup(createElement(TasteSensoryMeter, { spiciness: 3, chewiness: 4, aroma: 5 }));

    expect(html.match(/role="progressbar"/g)).toHaveLength(3);
    expect(html.match(/aria-valuenow="60"/g)).toHaveLength(1);
    expect(html.match(/aria-valuenow="80"/g)).toHaveLength(1);
    expect(html.match(/aria-valuenow="100"/g)).toHaveLength(1);
    expect(html).toContain('>60%</span>');
    expect(html).toContain('>80%</span>');
    expect(html).toContain('>100%</span>');
  });

  it('renders product-specific labels and 0-100 values when provided', () => {
    const html = renderToStaticMarkup(createElement(TasteSensoryMeter, {
      labelAxis1: 'Độ tê đầu lưỡi',
      labelAxis2: 'Mùi hạt dổi rang',
      labelAxis3: 'Độ thơm hậu vị',
      valueAxis1: 35,
      valueAxis2: 72,
      valueAxis3: 96,
    }));

    expect(html).toContain('Độ tê đầu lưỡi');
    expect(html).toContain('Mùi hạt dổi rang');
    expect(html).toContain('Độ thơm hậu vị');
    expect(html).toContain('aria-valuenow="35"');
    expect(html).toContain('aria-valuenow="72"');
    expect(html).toContain('aria-valuenow="96"');
  });

  it('uses the schema default profile when sensory fields are missing', () => {
    const html = renderToStaticMarkup(createElement(TasteSensoryMeter, {}));

    expect(html).toContain('aria-valuenow="60"');
    expect(html).toContain('aria-valuenow="80"');
    expect(html).toContain('aria-valuenow="100"');
  });
});