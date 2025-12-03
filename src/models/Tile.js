const { TileState, getNextTileState } = require('./TileState');

/**
 * Klasa reprezentująca pojedynczy kafelek
 * Single Responsibility: zarządza stanem jednego kafelka
 */
class Tile {
    /**
     * @param {number} rowIndex - indeks wiersza
     * @param {number} columnIndex - indeks kolumny (0-6, gdzie 6 to niedziela)
     * @param {string} state - stan kafelka (A, Praca, U)
     */
    constructor(rowIndex, columnIndex, state = TileState.A) {
        this.rowIndex = rowIndex;
        this.columnIndex = columnIndex;
        this.state = state;
    }

    /**
     * Przełącza stan kafelka na następny
     * @returns {string} nowy stan
     */
    toggleState() {
        this.state = getNextTileState(this.state);
        return this.state;
    }

    /**
     * Ustawia konkretny stan
     * @param {string} newState 
     */
    setState(newState) {
        if (Object.values(TileState).includes(newState)) {
            this.state = newState;
        }
    }

    /**
     * Sprawdza czy kafelek jest w stanie "Praca"
     * @returns {boolean}
     */
    isPraca() {
        return this.state === TileState.PRACA;
    }

    /**
     * Serializacja do obiektu
     * @returns {Object}
     */
    toJSON() {
        return {
            rowIndex: this.rowIndex,
            columnIndex: this.columnIndex,
            state: this.state
        };
    }

    /**
     * Deserializacja z obiektu
     * @param {Object} data 
     * @returns {Tile}
     */
    static fromJSON(data) {
        return new Tile(data.rowIndex, data.columnIndex, data.state);
    }
}

module.exports = Tile;
