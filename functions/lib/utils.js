"use strict";
/* eslint-disable */
Object.defineProperty(exports, "__esModule", { value: true });
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
exports.default = {
    shuffleArray,
    delay
};
//# sourceMappingURL=utils.js.map