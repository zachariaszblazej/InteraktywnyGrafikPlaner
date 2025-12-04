/**
 * Interaktywny Grafik Planer - Renderer
 * 
 * Architektura zgodna z SOLID:
 * - Single Responsibility: każda klasa ma jedno zadanie
 * - Open/Closed: łatwe rozszerzanie bez modyfikacji istniejącego kodu
 * - Dependency Inversion: wysokopoziomowe moduły nie zależą od niskopoziomowych
 */

// ===================================
// STAŁE I KONFIGURACJA
// ===================================

const TileState = Object.freeze({
    A: 'A',
    PRACA: 'Praca',
    U: 'U'
});

const TILE_STATE_ORDER = [TileState.A, TileState.PRACA, TileState.U];

const DAYS_OF_WEEK = [
    'Montag',
    'Dienstag',
    'Mittwoch',
    'Donnerstag',
    'Freitag',
    'Samstag',
    'Sonntag'
];

const MAX_REQUIRED_WORKERS = 20;

// ===================================
// WEEK DATE CALCULATOR
// ===================================

/**
 * Klasa odpowiedzialna za obliczanie dat na podstawie roku i numeru tygodnia
 * Single Responsibility: tylko obliczenia dat
 */
class WeekDateCalculator {
    /**
     * Pobiera daty dla danego tygodnia w roku (ISO 8601 - tydzień zaczyna się od poniedziałku)
     * @param {number} year - rok
     * @param {number} weekNumber - numer tygodnia (1-53)
     * @returns {Date[]} tablica 7 dat (pon-nd)
     */
    static getWeekDates(year, weekNumber) {
        // Znajdź pierwszy czwartek roku (ISO 8601)
        const jan4 = new Date(year, 0, 4);
        const dayOfWeek = jan4.getDay() || 7; // Niedziela = 7

        // Poniedziałek pierwszego tygodnia
        const firstMonday = new Date(jan4);
        firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);

        // Poniedziałek żądanego tygodnia
        const targetMonday = new Date(firstMonday);
        targetMonday.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);

        // Generuj 7 dni
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(targetMonday);
            date.setDate(targetMonday.getDate() + i);
            dates.push(date);
        }

        return dates;
    }

    /**
     * Formatuje datę jako DD.MM
     * @param {Date} date 
     * @returns {string}
     */
    static formatDateShort(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${day}.${month}`;
    }

    /**
     * Pobiera aktualny rok
     * @returns {number}
     */
    static getCurrentYear() {
        return new Date().getFullYear();
    }

    /**
     * Pobiera aktualny numer tygodnia (ISO 8601)
     * @returns {number}
     */
    static getCurrentWeekNumber() {
        const now = new Date();
        const jan4 = new Date(now.getFullYear(), 0, 4);
        const dayOfWeek = jan4.getDay() || 7;
        const firstMonday = new Date(jan4);
        firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);

        const diff = now - firstMonday;
        const weekNumber = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
        return Math.max(1, Math.min(53, weekNumber));
    }

    /**
     * Pobiera maksymalną liczbę tygodni w roku
     * @param {number} year 
     * @returns {number}
     */
    static getWeeksInYear(year) {
        const dec31 = new Date(year, 11, 31);
        const jan4 = new Date(year, 0, 4);
        const dayOfWeek = jan4.getDay() || 7;
        const firstMonday = new Date(jan4);
        firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);

        const diff = dec31 - firstMonday;
        return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000) / 7);
    }
}

// ===================================
// HISTORY MANAGER (Undo/Redo)
// ===================================

class HistoryManager {
    constructor(maxHistorySize = 100) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistorySize = maxHistorySize;
    }

    pushState(stateSnapshot) {
        this.undoStack.push(JSON.stringify(stateSnapshot));
        this.redoStack = [];

        if (this.undoStack.length > this.maxHistorySize) {
            this.undoStack.shift();
        }
    }

    undo(currentState) {
        if (this.undoStack.length === 0) return null;
        this.redoStack.push(JSON.stringify(currentState));
        return JSON.parse(this.undoStack.pop());
    }

    redo(currentState) {
        if (this.redoStack.length === 0) return null;
        this.undoStack.push(JSON.stringify(currentState));
        return JSON.parse(this.redoStack.pop());
    }

    canUndo() { return this.undoStack.length > 0; }
    canRedo() { return this.redoStack.length > 0; }
    clear() { this.undoStack = []; this.redoStack = []; }
}

// ===================================
// BOARD STATE MANAGER
// ===================================

class BoardStateManager {
    constructor() {
        this.state = this.createEmptyState();
    }

    createEmptyState() {
        return {
            year: WeekDateCalculator.getCurrentYear(),
            weekNumber: WeekDateCalculator.getCurrentWeekNumber(),
            columns: DAYS_OF_WEEK.map((_, index) => ({
                index,
                requiredWorkers: 1
            })),
            rows: []
        };
    }

    /**
     * Ustawia rok i numer tygodnia
     * @param {number} year 
     * @param {number} weekNumber 
     */
    setYearAndWeek(year, weekNumber) {
        this.state.year = year;
        this.state.weekNumber = Math.max(1, Math.min(53, weekNumber));
    }

    /**
     * Pobiera daty dla aktualnie wybranego tygodnia
     * @returns {Date[]}
     */
    getWeekDates() {
        return WeekDateCalculator.getWeekDates(this.state.year, this.state.weekNumber);
    }

    getState() {
        return JSON.parse(JSON.stringify(this.state));
    }

    setState(newState) {
        this.state = JSON.parse(JSON.stringify(newState));
    }

    addRow(header = '') {
        const newRow = {
            index: this.state.rows.length,
            header: header,
            includedInCalculations: true,
            tiles: DAYS_OF_WEEK.map((_, colIndex) => ({
                rowIndex: this.state.rows.length,
                columnIndex: colIndex,
                state: TileState.A
            }))
        };
        this.state.rows.push(newRow);
        return newRow;
    }

    removeRow(rowIndex) {
        if (rowIndex >= 0 && rowIndex < this.state.rows.length) {
            this.state.rows.splice(rowIndex, 1);
            this._reindexRows();
            return true;
        }
        return false;
    }

    _reindexRows() {
        this.state.rows.forEach((row, index) => {
            row.index = index;
            row.tiles.forEach(tile => {
                tile.rowIndex = index;
            });
        });
    }

    setRowHeader(rowIndex, header) {
        if (this.state.rows[rowIndex]) {
            this.state.rows[rowIndex].header = header;
        }
    }

    setRowIncluded(rowIndex, included) {
        if (this.state.rows[rowIndex]) {
            this.state.rows[rowIndex].includedInCalculations = included;
        }
    }

    /**
     * Przesuwa wiersz w górę (zamienia z poprzednim)
     * @param {number} rowIndex - indeks wiersza do przesunięcia
     * @returns {boolean} czy operacja się powiodła
     */
    moveRowUp(rowIndex) {
        if (rowIndex > 0 && rowIndex < this.state.rows.length) {
            this._swapRows(rowIndex, rowIndex - 1);
            return true;
        }
        return false;
    }

    /**
     * Przesuwa wiersz w dół (zamienia z następnym)
     * @param {number} rowIndex - indeks wiersza do przesunięcia
     * @returns {boolean} czy operacja się powiodła
     */
    moveRowDown(rowIndex) {
        if (rowIndex >= 0 && rowIndex < this.state.rows.length - 1) {
            this._swapRows(rowIndex, rowIndex + 1);
            return true;
        }
        return false;
    }

    /**
     * Zamienia miejscami dwa wiersze
     * @private
     * @param {number} indexA - indeks pierwszego wiersza
     * @param {number} indexB - indeks drugiego wiersza
     */
    _swapRows(indexA, indexB) {
        const temp = this.state.rows[indexA];
        this.state.rows[indexA] = this.state.rows[indexB];
        this.state.rows[indexB] = temp;
        this._reindexRows();
    }

    toggleTileState(rowIndex, columnIndex) {
        const row = this.state.rows[rowIndex];
        if (row && row.tiles[columnIndex]) {
            const currentState = row.tiles[columnIndex].state;
            const currentIdx = TILE_STATE_ORDER.indexOf(currentState);
            const nextIdx = (currentIdx + 1) % TILE_STATE_ORDER.length;
            row.tiles[columnIndex].state = TILE_STATE_ORDER[nextIdx];
            return row.tiles[columnIndex].state;
        }
        return null;
    }

    setColumnRequiredWorkers(columnIndex, count) {
        if (this.state.columns[columnIndex] && count > 0) {
            this.state.columns[columnIndex].requiredWorkers = count;
        }
    }

    countPracaInColumn(columnIndex) {
        return this.state.rows
            .filter(row => row.includedInCalculations)
            .reduce((count, row) => {
                const tile = row.tiles[columnIndex];
                return count + (tile && tile.state === TileState.PRACA ? 1 : 0);
            }, 0);
    }

    isColumnValid(columnIndex) {
        const column = this.state.columns[columnIndex];
        if (!column) return false;

        const pracaCount = this.countPracaInColumn(columnIndex);
        const required = column.requiredWorkers;
        const isSunday = columnIndex === 6;

        if (isSunday) {
            return pracaCount === required;
        } else {
            return pracaCount === required || pracaCount === required + 1;
        }
    }

    getColumnsStatus() {
        return this.state.columns.map((column, index) => {
            const pracaCount = this.countPracaInColumn(index);
            const required = column.requiredWorkers;
            const isSunday = index === 6;
            const isValid = this.isColumnValid(index);
            const hasExtraOne = !isSunday && pracaCount === required + 1;

            return {
                index,
                name: DAYS_OF_WEEK[index],
                requiredWorkers: required,
                pracaCount,
                isValid,
                isSunday,
                hasExtraOne
            };
        });
    }
}

// ===================================
// UI RENDERER
// ===================================

class BoardRenderer {
    constructor(boardManager, onStateChange) {
        this.boardManager = boardManager;
        this.onStateChange = onStateChange;
        this.elements = {};
        this.cacheElements();
    }

    cacheElements() {
        this.elements = {
            boardBody: document.getElementById('board-body'),
            requiredWorkersRow: document.querySelector('.required-workers-row'),
            daysHeaderRow: document.querySelector('.days-header-row'),
            pracaCountRow: document.querySelector('.praca-count-row'),
            btnUndo: document.getElementById('btn-undo'),
            btnRedo: document.getElementById('btn-redo'),
            btnAddRow: document.getElementById('btn-add-row'),
            btnGenerateExcel: document.getElementById('btn-generate-excel'),
            yearInput: document.getElementById('year-input'),
            weekInput: document.getElementById('week-input')
        };
    }

    render() {
        this.renderDaysHeader();
        this.renderRequiredWorkersSelects();
        this.renderRows();
        this.renderPracaCounts();
        this.updateColumnValidation();
        this.updateWeekInputs();
    }

    renderDaysHeader() {
        // Usuń stare nagłówki dni (ale zostaw pierwsze dwie kolumny)
        const existingHeaders = this.elements.daysHeaderRow.querySelectorAll('.day-header-cell');
        existingHeaders.forEach(el => el.remove());

        const weekDates = this.boardManager.getWeekDates();

        DAYS_OF_WEEK.forEach((day, index) => {
            const th = document.createElement('th');
            th.className = 'day-header-cell';
            th.dataset.columnIndex = index;

            const dateStr = WeekDateCalculator.formatDateShort(weekDates[index]);
            th.innerHTML = `<div class="day-header">
                <span class="day-name">${day}</span>
                <span class="day-date">${dateStr}</span>
            </div>`;
            this.elements.daysHeaderRow.appendChild(th);
        });
    }

    /**
     * Aktualizuje pola roku i tygodnia w UI
     */
    updateWeekInputs() {
        const state = this.boardManager.getState();
        if (this.elements.yearInput) {
            this.elements.yearInput.value = state.year;
        }
        if (this.elements.weekInput) {
            this.elements.weekInput.value = state.weekNumber;
        }
    }

    renderRequiredWorkersSelects() {
        // Usuń stare selecty
        const existingSelects = this.elements.requiredWorkersRow.querySelectorAll('.required-select-cell');
        existingSelects.forEach(el => el.remove());

        const state = this.boardManager.getState();

        state.columns.forEach((column, index) => {
            const th = document.createElement('th');
            th.className = 'required-select-cell';
            th.dataset.columnIndex = index;

            const select = document.createElement('select');
            select.className = 'required-select';
            select.dataset.columnIndex = index;
            select.title = `Wymagana liczba dla ${DAYS_OF_WEEK[index]}`;

            for (let i = 1; i <= MAX_REQUIRED_WORKERS; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                if (i === column.requiredWorkers) {
                    option.selected = true;
                }
                select.appendChild(option);
            }

            select.addEventListener('change', (e) => {
                this.onStateChange('setColumnRequired', {
                    columnIndex: index,
                    value: parseInt(e.target.value)
                });
            });

            th.appendChild(select);
            this.elements.requiredWorkersRow.appendChild(th);
        });
    }

    renderRows() {
        this.elements.boardBody.innerHTML = '';
        const state = this.boardManager.getState();

        if (state.rows.length === 0) {
            this.renderEmptyState();
            return;
        }

        state.rows.forEach((row, rowIndex) => {
            const tr = this.createRowElement(row, rowIndex);
            this.elements.boardBody.appendChild(tr);
        });
    }

    renderEmptyState() {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td colspan="${9}" class="empty-state">
                <p>Brak wierszy w tablicy</p>
                <p>Kliknij "Dodaj wiersz" aby rozpocząć</p>
            </td>
        `;
        this.elements.boardBody.appendChild(tr);
    }

    createRowElement(row, rowIndex) {
        const tr = document.createElement('tr');
        tr.className = `board-row ${row.includedInCalculations ? '' : 'excluded'}`;
        tr.dataset.rowIndex = rowIndex;

        const totalRows = this.boardManager.getState().rows.length;

        // Kontrolki wiersza (checkbox + przyciski przesuwania)
        const tdControls = document.createElement('td');
        tdControls.className = 'row-controls';

        // Kontener na wszystkie kontrolki w jednej linii
        const controlsContent = document.createElement('div');
        controlsContent.className = 'row-controls-content';

        // Kontener na przyciski przesuwania
        const moveButtons = document.createElement('div');
        moveButtons.className = 'move-buttons';

        // Przycisk w górę
        const btnUp = document.createElement('button');
        btnUp.className = 'btn-move btn-move-up';
        btnUp.innerHTML = '▲';
        btnUp.title = 'Przesuń w górę';
        btnUp.disabled = rowIndex === 0;
        btnUp.addEventListener('click', () => {
            this.onStateChange('moveRowUp', { rowIndex });
        });
        moveButtons.appendChild(btnUp);

        // Przycisk w dół
        const btnDown = document.createElement('button');
        btnDown.className = 'btn-move btn-move-down';
        btnDown.innerHTML = '▼';
        btnDown.title = 'Przesuń w dół';
        btnDown.disabled = rowIndex === totalRows - 1;
        btnDown.addEventListener('click', () => {
            this.onStateChange('moveRowDown', { rowIndex });
        });
        moveButtons.appendChild(btnDown);

        controlsContent.appendChild(moveButtons);

        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'row-checkbox';
        checkbox.checked = row.includedInCalculations;
        checkbox.title = 'Uwzględnij w wyliczeniach';
        checkbox.addEventListener('change', (e) => {
            this.onStateChange('setRowIncluded', {
                rowIndex,
                value: e.target.checked
            });
        });
        controlsContent.appendChild(checkbox);

        tdControls.appendChild(controlsContent);
        tr.appendChild(tdControls);

        // Header input
        const tdHeader = document.createElement('td');
        tdHeader.className = 'row-header';
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'row-header-input';
        input.value = row.header;
        input.placeholder = 'Nazwa pracownika...';
        input.addEventListener('change', (e) => {
            this.onStateChange('setRowHeader', {
                rowIndex,
                value: e.target.value
            });
        });
        tdHeader.appendChild(input);

        // Delete button
        const btnDelete = document.createElement('button');
        btnDelete.className = 'btn-delete-row';
        btnDelete.innerHTML = '×';
        btnDelete.title = 'Usuń wiersz';
        btnDelete.addEventListener('click', () => {
            this.onStateChange('removeRow', { rowIndex });
        });
        tdHeader.appendChild(btnDelete);

        tr.appendChild(tdHeader);

        // Tiles
        row.tiles.forEach((tile, colIndex) => {
            const td = document.createElement('td');
            td.className = 'tile-cell';
            td.dataset.columnIndex = colIndex;

            const tileDiv = document.createElement('div');
            tileDiv.className = this.getTileClasses(tile, row.includedInCalculations);
            tileDiv.dataset.rowIndex = rowIndex;
            tileDiv.dataset.columnIndex = colIndex;
            tileDiv.textContent = tile.state;
            tileDiv.addEventListener('click', () => {
                this.onStateChange('toggleTile', { rowIndex, columnIndex: colIndex });
            });

            td.appendChild(tileDiv);
            tr.appendChild(td);
        });

        return tr;
    }

    getTileClasses(tile, rowIncluded) {
        let classes = 'tile';

        switch (tile.state) {
            case TileState.A:
                classes += ' tile-a';
                break;
            case TileState.PRACA:
                classes += ' tile-praca';
                if (!rowIncluded) {
                    classes += ' excluded';
                }
                break;
            case TileState.U:
                classes += ' tile-u';
                break;
        }

        return classes;
    }

    renderPracaCounts() {
        // Usuń stare liczniki
        const existingCounts = this.elements.pracaCountRow.querySelectorAll('.praca-count-cell');
        existingCounts.forEach(el => el.remove());

        const columnsStatus = this.boardManager.getColumnsStatus();

        columnsStatus.forEach((status, index) => {
            const td = document.createElement('td');
            td.className = 'praca-count-cell';
            td.dataset.columnIndex = index;

            const span = document.createElement('span');
            span.className = `praca-count ${status.isValid ? 'valid' : 'invalid'}`;

            // Wyświetl "+1" jeśli jest o jeden więcej niż wymagane
            if (status.hasExtraOne) {
                span.textContent = `${status.pracaCount} (+1)`;
            } else {
                span.textContent = status.pracaCount;
            }

            td.appendChild(span);
            this.elements.pracaCountRow.appendChild(td);
        });
    }

    updateColumnValidation() {
        const columnsStatus = this.boardManager.getColumnsStatus();

        // Aktualizuj nagłówki dni
        const dayHeaders = this.elements.daysHeaderRow.querySelectorAll('.day-header-cell');
        dayHeaders.forEach((header, index) => {
            header.classList.toggle('column-valid', columnsStatus[index]?.isValid);
        });

        // Aktualizuj selecty
        const selectCells = this.elements.requiredWorkersRow.querySelectorAll('.required-select-cell');
        selectCells.forEach((cell, index) => {
            cell.classList.toggle('column-valid', columnsStatus[index]?.isValid);
        });

        // Aktualizuj liczniki
        const countCells = this.elements.pracaCountRow.querySelectorAll('.praca-count-cell');
        countCells.forEach((cell, index) => {
            cell.classList.toggle('column-valid', columnsStatus[index]?.isValid);
        });

        // Aktualizuj wszystkie komórki kafelków w każdej kolumnie
        const rows = this.elements.boardBody.querySelectorAll('.board-row');
        rows.forEach(row => {
            const tileCells = row.querySelectorAll('.tile-cell');
            tileCells.forEach(cell => {
                const colIndex = parseInt(cell.dataset.columnIndex);
                cell.classList.toggle('column-valid', columnsStatus[colIndex]?.isValid);
            });
        });
    }

    updateUndoRedoButtons(canUndo, canRedo) {
        this.elements.btnUndo.disabled = !canUndo;
        this.elements.btnRedo.disabled = !canRedo;
    }
}

// ===================================
// APPLICATION CONTROLLER
// ===================================

class AppController {
    constructor() {
        this.boardManager = new BoardStateManager();
        this.historyManager = new HistoryManager();
        this.renderer = new BoardRenderer(
            this.boardManager,
            this.handleStateChange.bind(this)
        );

        this.isLoading = true;
        this.saveDebounceTimer = null;
    }

    async initialize() {
        await this.loadState();
        this.renderer.render();
        this.setupEventListeners();
        this.updateUndoRedoButtons();
        this.isLoading = false;
    }

    async loadState() {
        try {
            const savedState = await window.electronAPI.loadState();
            if (savedState) {
                this.boardManager.setState(savedState);
            }
        } catch (error) {
            console.error('Błąd podczas wczytywania stanu:', error);
        }
    }

    async saveState() {
        try {
            await window.electronAPI.saveState(this.boardManager.getState());
        } catch (error) {
            console.error('Błąd podczas zapisywania stanu:', error);
        }
    }

    debouncedSave() {
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
        }
        this.saveDebounceTimer = setTimeout(() => {
            this.saveState();
        }, 500);
    }

    setupEventListeners() {
        // Przycisk dodawania wiersza
        document.getElementById('btn-add-row').addEventListener('click', () => {
            this.handleStateChange('addRow', {});
        });

        // Przyciski undo/redo
        document.getElementById('btn-undo').addEventListener('click', () => {
            this.undo();
        });

        document.getElementById('btn-redo').addEventListener('click', () => {
            this.redo();
        });

        // Skróty klawiszowe
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.undo();
            } else if (e.ctrlKey && e.key === 'y') {
                e.preventDefault();
                this.redo();
            }
        });

        // Zapisz przed zamknięciem
        window.addEventListener('beforeunload', () => {
            this.saveState();
        });

        // Obsługa zmiany roku i tygodnia
        const yearInput = document.getElementById('year-input');
        const weekInput = document.getElementById('week-input');

        yearInput.addEventListener('change', (e) => {
            const year = parseInt(e.target.value);
            const week = parseInt(weekInput.value);
            if (year >= 2020 && year <= 2099) {
                this.handleStateChange('setYearAndWeek', { year, weekNumber: week });
            }
        });

        weekInput.addEventListener('change', (e) => {
            const year = parseInt(yearInput.value);
            const week = parseInt(e.target.value);
            if (week >= 1 && week <= 53) {
                this.handleStateChange('setYearAndWeek', { year, weekNumber: week });
            }
        });

        // Przycisk generowania Excel
        document.getElementById('btn-generate-excel').addEventListener('click', () => {
            this.generateExcel();
        });
    }

    /**
     * Generuje plik Excel z aktualnym stanem tablicy
     */
    async generateExcel() {
        try {
            const boardState = this.boardManager.getState();
            const result = await window.electronAPI.generateExcel(boardState);

            if (result.success) {
                console.log('Plik Excel wygenerowany:', result.filePath);
            } else if (result.canceled) {
                console.log('Generowanie anulowane przez użytkownika');
            } else {
                console.error('Błąd generowania:', result.error);
                alert('Błąd podczas generowania pliku Excel: ' + result.error);
            }
        } catch (error) {
            console.error('Błąd generowania Excel:', error);
            alert('Błąd podczas generowania pliku Excel: ' + error.message);
        }
    }

    handleStateChange(action, data) {
        if (this.isLoading) return;

        // Zapisz stan przed zmianą (dla undo)
        const previousState = this.boardManager.getState();

        switch (action) {
            case 'addRow':
                this.boardManager.addRow(data.header || '');
                break;
            case 'removeRow':
                this.boardManager.removeRow(data.rowIndex);
                break;
            case 'setRowHeader':
                this.boardManager.setRowHeader(data.rowIndex, data.value);
                break;
            case 'setRowIncluded':
                this.boardManager.setRowIncluded(data.rowIndex, data.value);
                break;
            case 'toggleTile':
                this.boardManager.toggleTileState(data.rowIndex, data.columnIndex);
                break;
            case 'setColumnRequired':
                this.boardManager.setColumnRequiredWorkers(data.columnIndex, data.value);
                break;
            case 'moveRowUp':
                this.boardManager.moveRowUp(data.rowIndex);
                break;
            case 'moveRowDown':
                this.boardManager.moveRowDown(data.rowIndex);
                break;
            case 'setYearAndWeek':
                this.boardManager.setYearAndWeek(data.year, data.weekNumber);
                break;
            default:
                console.warn('Nieznana akcja:', action);
                return;
        }

        // Zapisz poprzedni stan do historii
        this.historyManager.pushState(previousState);

        // Aktualizuj UI
        this.renderer.render();
        this.updateUndoRedoButtons();

        // Zapisz stan
        this.debouncedSave();
    }

    undo() {
        const previousState = this.historyManager.undo(this.boardManager.getState());
        if (previousState) {
            this.boardManager.setState(previousState);
            this.renderer.render();
            this.updateUndoRedoButtons();
            this.debouncedSave();
        }
    }

    redo() {
        const nextState = this.historyManager.redo(this.boardManager.getState());
        if (nextState) {
            this.boardManager.setState(nextState);
            this.renderer.render();
            this.updateUndoRedoButtons();
            this.debouncedSave();
        }
    }

    updateUndoRedoButtons() {
        this.renderer.updateUndoRedoButtons(
            this.historyManager.canUndo(),
            this.historyManager.canRedo()
        );
    }
}

// ===================================
// INICJALIZACJA APLIKACJI
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    const app = new AppController();
    app.initialize();
});
