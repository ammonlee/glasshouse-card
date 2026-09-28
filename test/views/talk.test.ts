import '../../src/glasshouse-card';
import { makeHass } from '../helpers/hass';

const states = [
  { entity_id: 'camera.door', state: 'recording', attributes: { access_token: 't' } },
  { entity_id: 'media_player.door_speaker', state: 'idle' },
  { entity_id: 'tts.google_en_com', state: 'unknown' },
  { entity_id: 'tts.home_assistant_cloud', state: 'unknown' },
];

async function ring(doorbell: Record<string, unknown>) {
  const h = makeHass(states);
  const el = document.createElement('glasshouse-card') as any;
  el.setConfig({ type: 'custom:glasshouse-card', home: { doorbell: { camera: 'camera.door', ...doorbell } } });
  el.hass = h; document.body.appendChild(el); await el.updateComplete;
  el.ring(); await el.updateComplete;
  return { el, h, q: (s: string) => el.shadowRoot!.querySelector(s) as HTMLElement, qa: (s: string) => [...el.shadowRoot!.querySelectorAll(s)] as HTMLElement[] };
}

describe('doorbell Talk', () => {
  it('opens quick replies and speaks the chosen one at the door', async () => {
    const { el, h, q, qa } = await ring({ speaker: 'media_player.door_speaker' });
    q('[data-test="talk"]').click(); await el.updateComplete;
    const replies = qa('[data-test="reply"]');
    expect(replies.map((r) => r.textContent!.trim())).toEqual(["Be right there!", 'Please leave the package at the door. Thank you!', "Sorry, we can't come to the door right now."]);
    replies[0].click(); await Promise.resolve();
    expect(h.calls).toContainEqual(['tts', 'speak', { media_player_entity_id: 'media_player.door_speaker', message: 'Be right there!', cache: true }, { entity_id: 'tts.home_assistant_cloud' }]);
    await el.updateComplete;
    expect(q('[data-test="reply"]')).toBeNull();   // back to the main buttons
  });
  it('uses the configured voice and replies', async () => {
    const { el, h, q, qa } = await ring({ speaker: 'media_player.door_speaker', tts: 'tts.google_en_com', replies: ['Hang on!'] });
    q('[data-test="talk"]').click(); await el.updateComplete;
    expect(qa('[data-test="reply"]').map((r) => r.textContent!.trim())).toEqual(['Hang on!']);
    qa('[data-test="reply"]')[0].click(); await Promise.resolve();
    expect(h.calls.at(-1)).toEqual(['tts', 'speak', { media_player_entity_id: 'media_player.door_speaker', message: 'Hang on!', cache: true }, { entity_id: 'tts.google_en_com' }]);
  });
  it('replying restarts the takeover countdown', async () => {
    const { el, q, qa } = await ring({ speaker: 'media_player.door_speaker' });
    el._overlay = { ...el._overlay, until: Date.now() + 5000 };
    q('[data-test="talk"]').click(); await el.updateComplete;
    qa('[data-test="reply"]')[0].click(); await Promise.resolve(); await el.updateComplete;
    expect(el._overlay.until - Date.now()).toBeGreaterThan(40_000);
  });
  it('shows no Talk button without a doorbell speaker', async () => {
    const { q } = await ring({});
    expect(q('[data-test="talk"]')).toBeNull();
  });
});
