/**
 * System Undo/Redo (Command Pattern)
 * Single Responsibility: zarządzanie historią akcji
 * Open/Closed: łatwe dodawanie nowych typów akcji
 */
class HistoryManager {
    /**
     * @param {number} maxHistorySize - maksymalna liczba akcji w historii
     */
    constructor(maxHistorySize = 100) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistorySize = maxHistorySize;
    }

    /**
     * Zapisuje snapshot stanu przed wykonaniem akcji
     * @param {Object} stateSnapshot - kopia stanu przed zmianą
     */
    pushState(stateSnapshot) {
        this.undoStack.push(JSON.stringify(stateSnapshot));

        // Czyść redo stack po nowej akcji
        this.redoStack = [];

        // Ogranicz rozmiar historii
        if (this.undoStack.length > this.maxHistorySize) {
            this.undoStack.shift();
        }
    }

    /**
     * Cofa ostatnią akcję
     * @param {Object} currentState - aktualny stan
     * @returns {Object|null} poprzedni stan lub null jeśli brak historii
     */
    undo(currentState) {
        if (this.undoStack.length === 0) {
            return null;
        }

        // Zapisz aktualny stan do redo
        this.redoStack.push(JSON.stringify(currentState));

        // Pobierz poprzedni stan
        const previousStateJson = this.undoStack.pop();
        return JSON.parse(previousStateJson);
    }

    /**
     * Przywraca cofniętą akcję
     * @param {Object} currentState - aktualny stan
     * @returns {Object|null} przywrócony stan lub null jeśli brak historii
     */
    redo(currentState) {
        if (this.redoStack.length === 0) {
            return null;
        }

        // Zapisz aktualny stan do undo
        this.undoStack.push(JSON.stringify(currentState));

        // Pobierz następny stan
        const nextStateJson = this.redoStack.pop();
        return JSON.parse(nextStateJson);
    }

    /**
     * Sprawdza czy można cofnąć
     * @returns {boolean}
     */
    canUndo() {
        return this.undoStack.length > 0;
    }

    /**
     * Sprawdza czy można przywrócić
     * @returns {boolean}
     */
    canRedo() {
        return this.redoStack.length > 0;
    }

    /**
     * Czyści całą historię
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
    }

    /**
     * Pobiera informacje o stanie historii
     * @returns {Object}
     */
    getStatus() {
        return {
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            undoCount: this.undoStack.length,
            redoCount: this.redoStack.length
        };
    }
}

// Eksport dla użycia w renderer (bez require)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HistoryManager;
}
