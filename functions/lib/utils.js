"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Shuffles (randomizes) position of elements within an array
 * @param {T[]} array
 * @return {T[]} The shuffled array
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
/**
 * Delays process by the given duration
 *
 * @param {number} ms miliseconds
 * @return {Promise<unknown>} promise
 */
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
exports.default = {
    shuffleArray,
    delay,
};
//# sourceMappingURL=utils.js.map