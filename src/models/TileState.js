/**
 * Enum dla stanów kafelka
 * Single Responsibility: reprezentuje tylko możliwe stany kafelka
 */
const TileState = Object.freeze({
    A: 'A',
    PRACA: 'Praca',
    U: 'U'
});

/**
 * Kolejność stanów do przełączania (switch)
 */
const TILE_STATE_ORDER = [TileState.A, TileState.PRACA, TileState.U];

/**
 * Pobiera następny stan kafelka (cyklicznie)
 * @param {string} currentState - aktualny stan
 * @returns {string} następny stan
 */
function getNextTileState(currentState) {
    const currentIndex = TILE_STATE_ORDER.indexOf(currentState);
    const nextIndex = (currentIndex + 1) % TILE_STATE_ORDER.length;
    return TILE_STATE_ORDER[nextIndex];
}

module.exports = { TileState, TILE_STATE_ORDER, getNextTileState };
