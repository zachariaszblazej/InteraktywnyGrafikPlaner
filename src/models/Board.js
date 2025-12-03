const Row = require('./Row');
const Column = require('./Column');
const { TileState } = require('./TileState');

/**
 * Klasa reprezentująca całą tablicę grafiku
 * Single Responsibility: zarządza strukturą tablicy
 */
class Board {
    /**
     * @param {Column[]} columns - kolumny (dni tygodnia)
     * @param {Row[]} rows - wiersze tablicy
     */
    constructor(columns = null, rows = null) {
        this.columns = columns || this._createDefaultColumns();
        this.rows = rows || [];
    }

    /**
     * Tworzy domyślne kolumny (7 dni tygodnia)
     * @private
     * @returns {Column[]}
     */
    _createDefaultColumns() {
        return Array.from({ length: 7 }, (_, index) => new Column(index, 1));
    }

    /**
     * Dodaje nowy wiersz
     * @param {string} header - nagłówek wiersza
     * @returns {Row} nowo utworzony wiersz
     */
    addRow(header = '') {
        const newRow = new Row(this.rows.length, header, true);
        this.rows.push(newRow);
        return newRow;
    }

    /**
     * Usuwa wiersz o podanym indeksie
     * @param {number} rowIndex 
     * @returns {boolean} czy usunięto
     */
    removeRow(rowIndex) {
        if (rowIndex >= 0 && rowIndex < this.rows.length) {
            this.rows.splice(rowIndex, 1);
            // Aktualizuj indeksy pozostałych wierszy
            this.rows.forEach((row, index) => row.updateIndex(index));
            return true;
        }
        return false;
    }

    /**
     * Pobiera wiersz o podanym indeksie
     * @param {number} rowIndex 
     * @returns {Row|null}
     */
    getRow(rowIndex) {
        return this.rows[rowIndex] || null;
    }

    /**
     * Pobiera kolumnę o podanym indeksie
     * @param {number} columnIndex 
     * @returns {Column|null}
     */
    getColumn(columnIndex) {
        return this.columns[columnIndex] || null;
    }

    /**
     * Pobiera kafelek na podstawie współrzędnych
     * @param {number} rowIndex 
     * @param {number} columnIndex 
     * @returns {Tile|null}
     */
    getTile(rowIndex, columnIndex) {
        const row = this.getRow(rowIndex);
        return row ? row.getTile(columnIndex) : null;
    }

    /**
     * Zlicza kafelki w stanie "Praca" w danej kolumnie
     * (tylko z wierszy branych pod uwagę)
     * @param {number} columnIndex 
     * @returns {number}
     */
    countPracaInColumn(columnIndex) {
        return this.rows
            .filter(row => row.includedInCalculations)
            .reduce((count, row) => {
                const tile = row.getTile(columnIndex);
                return count + (tile && tile.isPraca() ? 1 : 0);
            }, 0);
    }

    /**
     * Sprawdza czy kolumna spełnia wymagania
     * @param {number} columnIndex 
     * @returns {boolean}
     */
    isColumnValid(columnIndex) {
        const column = this.getColumn(columnIndex);
        if (!column) return false;

        const pracaCount = this.countPracaInColumn(columnIndex);
        const required = column.requiredWorkers;

        if (column.isSunday()) {
            // Niedziela: dokładnie wymagana liczba
            return pracaCount === required;
        } else {
            // Inne dni: wymagana lub wymagana + 1
            return pracaCount === required || pracaCount === required + 1;
        }
    }

    /**
     * Pobiera status wszystkich kolumn
     * @returns {Object[]} tablica z informacjami o każdej kolumnie
     */
    getColumnsStatus() {
        return this.columns.map((column, index) => ({
            index,
            name: column.name,
            requiredWorkers: column.requiredWorkers,
            pracaCount: this.countPracaInColumn(index),
            isValid: this.isColumnValid(index),
            isSunday: column.isSunday()
        }));
    }

    /**
     * Serializacja do obiektu
     * @returns {Object}
     */
    toJSON() {
        return {
            columns: this.columns.map(col => col.toJSON()),
            rows: this.rows.map(row => row.toJSON())
        };
    }

    /**
     * Deserializacja z obiektu
     * @param {Object} data 
     * @returns {Board}
     */
    static fromJSON(data) {
        const columns = data.columns.map(colData => Column.fromJSON(colData));
        const rows = data.rows.map(rowData => Row.fromJSON(rowData));
        return new Board(columns, rows);
    }
}

module.exports = Board;
