/**
 * Offscreen document script.
 * Listens for PLAY_CHIME messages from the background service worker
 * and plays a short completion chime using the Web Audio API.
 *
 * Service workers (background.js) cannot use AudioContext, so we
 * delegate audio playback to this offscreen document.
 */

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'PLAY_CHIME') {
        playChime();
    }
});

function playChime() {
    try {
        const ctx = new AudioContext();

        // Three-note ascending arpeggio: C5 -> E5 -> G5
        const notes = [
            { freq: 523.25, delay: 0.00 },  // C5
            { freq: 659.25, delay: 0.18 },  // E5
            { freq: 783.99, delay: 0.36 },  // G5
        ];

        notes.forEach(({ freq, delay }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.value = freq;

            const t = ctx.currentTime + delay;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.25, t + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

            osc.start(t);
            osc.stop(t + 0.6);
        });

        // AudioContext can be closed after the last note finishes
        setTimeout(() => ctx.close(), 1500);

    } catch (e) {
        console.warn('[Offscreen] Could not play chime:', e.message);
    }
}
