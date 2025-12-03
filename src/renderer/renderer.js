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
    'Poniedziałek',
    'Wtorek',
    'Środa',
    'Czwartek',
    'Piątek',
    'Sobota',
    'Niedziela'
];

const MAX_REQUIRED_WORKERS = 20;

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
            columns: DAYS_OF_WEEK.map((_, index) => ({
                index,
                requiredWorkers: 1
            })),
            rows: []
        };
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
            btnAddRow: document.getElementById('btn-add-row')
        };
    }

    render() {
        this.renderDaysHeader();
        this.renderRequiredWorkersSelects();
        this.renderRows();
        this.renderPracaCounts();
        this.updateColumnValidation();
    }

    renderDaysHeader() {
        // Usuń stare nagłówki dni (ale zostaw pierwsze dwie kolumny)
        const existingHeaders = this.elements.daysHeaderRow.querySelectorAll('.day-header-cell');
        existingHeaders.forEach(el => el.remove());

        DAYS_OF_WEEK.forEach((day, index) => {
            const th = document.createElement('th');
            th.className = 'day-header-cell';
            th.dataset.columnIndex = index;
            th.innerHTML = `<div class="day-header"><span class="day-name">${day}</span></div>`;
            this.elements.daysHeaderRow.appendChild(th);
        });
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

        // Checkbox
        const tdCheckbox = document.createElement('td');
        tdCheckbox.className = 'row-controls';
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
        tdCheckbox.appendChild(checkbox);
        tr.appendChild(tdCheckbox);

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
