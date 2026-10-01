import { h } from '../dom.js';

// A word's picture: Mentava's tile in a fixed square frame (object-fit: contain, rounded, soft background) so tiles of
// different shapes never make a layout jump. A word without a tile falls back to its emoji. The alt text is the word.
export function picture(item, cls = '') {
  if (item.image) return h('span', { class: 'pic-frame ' + cls }, h('img', { src: item.image, alt: item.word, decoding: 'async', draggable: 'false' }));
  return emojiFrame(item.emoji, cls);
}

// Where no tile exists, the emoji sits in the same rounded frame (its size follows the frame's).
export const emojiFrame = (emoji, cls = '') => h('span', { class: 'pic-frame emoji-frame ' + cls, 'aria-hidden': 'true' }, h('span', { class: 'em' }, emoji));
