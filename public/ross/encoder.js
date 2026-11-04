// MP3 encoder for /ross, in a Web Worker so encoding never blocks the page.
// Each message is one section: Int16Array PCM in, a complete MP3 stream out. MP3 streams
// can simply be concatenated, so sections can be encoded in parallel on several workers.
importScripts('/lame.all.js');

const SAMPLE_RATE = 24000;
const KBPS = 64; // mono speech
const BLOCK = 1152;

self.onmessage = ({ data: pcm }) => {
  const encoder = new lamejs.Mp3Encoder(1, SAMPLE_RATE, KBPS);
  const parts = [];
  let size = 0;
  const add = (out) => {
    if (out.length) {
      parts.push(out);
      size += out.length;
    }
  };
  for (let i = 0; i < pcm.length; i += BLOCK) add(encoder.encodeBuffer(pcm.subarray(i, i + BLOCK)));
  add(encoder.flush());
  const mp3 = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    mp3.set(new Uint8Array(p.buffer, p.byteOffset, p.length), at);
    at += p.length;
  }
  self.postMessage(mp3, [mp3.buffer]);
};
