const Tile = require('./Tile');
const { TileState } = require('./TileState');

/**
 * Klasa reprezentująca wiersz tablicy
 * Single Responsibility: zarządza danymi jednego wiersza
 */
class Row {
    /**
     * @param {number} index - indeks wiersza
     * @param {string} header - nagłówek wiersza (nazwa)
     * @param {boolean} includedInCalculations - czy wiersz jest brany pod uwagę w wyliczeniach
     * @param {Tile[]} tiles - kafelki w wierszu (7 sztuk)
     */
    constructor(index, header = '', includedInCalculations = true, tiles = null) {
        this.index = index;
        this.header = header;
        this.includedInCalculations = includedInCalculations;
        this.tiles = tiles || this._createDefaultTiles();
    }

    /**
     * Tworzy domyślne kafelki dla wiersza (7 dni tygodnia)
     * @private
     * @returns {Tile[]}
     */
    _createDefaultTiles() {
        return Array.from({ length: 7 }, (_, colIndex) =>
            new Tile(this.index, colIndex, TileState.A)
        );
    }

    /**
     * Pobiera kafelek dla danego dnia
     * @param {number} dayIndex - indeks dnia (0-6)
     * @returns {Tile}
     */
    getTile(dayIndex) {
        return this.tiles[dayIndex];
    }

    /**
     * Ustawia nagłówek wiersza
     * @param {string} header 
     */
    setHeader(header) {
        this.header = header;
    }

    /**
     * Ustawia czy wiersz jest brany pod uwagę w wyliczeniach
     * @param {boolean} included 
     */
    setIncludedInCalculations(included) {
        this.includedInCalculations = included;
    }

    /**
     * Aktualizuje indeksy kafelków po zmianie indeksu wiersza
     * @param {number} newIndex 
     */
    updateIndex(newIndex) {
        this.index = newIndex;
        this.tiles.forEach(tile => {
            tile.rowIndex = newIndex;
        });
    }

    /**
     * Serializacja do obiektu
     * @returns {Object}
     */
    toJSON() {
        return {
            index: this.index,
            header: this.header,
            includedInCalculations: this.includedInCalculations,
            tiles: this.tiles.map(tile => tile.toJSON())
        };
    }

    /**
     * Deserializacja z obiektu
     * @param {Object} data 
     * @returns {Row}
     */
    static fromJSON(data) {
        const tiles = data.tiles.map(tileData => Tile.fromJSON(tileData));
        return new Row(data.index, data.header, data.includedInCalculations, tiles);
    }
}

module.exports = Row;
