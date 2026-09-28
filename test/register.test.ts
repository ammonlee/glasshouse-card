import '../src/glasshouse-card';

describe('registration', () => {
  it('defines the custom element', () => {
    expect(customElements.get('glasshouse-card')).toBeDefined();
  });
  it('registers in window.customCards for the card picker', () => {
    const cards = (window as any).customCards as Array<{ type: string; name: string }>;
    expect(cards.find((c) => c.type === 'glasshouse-card')?.name).toBe('Glasshouse');
  });
});
