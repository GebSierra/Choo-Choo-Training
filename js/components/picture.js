import { h } from '../dom.js';

// A word's picture: Mentava's tile in a fixed square frame (object-fit: contain, rounded, soft background) so tiles of
// different shapes never make a layout jump. A word without a tile falls back to its emoji. The alt text is the word.
export function picture(item, cls = '') {
  if (item.image) return h('span', { class: 'pic-frame ' + cls }, h('img', { src: item.image, alt: item.word, decoding: 'async', draggable: 'false' }));
  return h('span', { class: 'emoji ' + cls, 'aria-hidden': 'true' }, item.emoji);
}
