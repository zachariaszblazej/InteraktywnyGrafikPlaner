const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * Serwis do persystencji danych
 * Single Responsibility: zapisywanie i odczytywanie stanu aplikacji
 */
class StorageService {
    constructor() {
        this.dataPath = this._getDataPath();
        this._ensureDataDirectory();
    }

    /**
     * Pobiera ścieżkę do pliku z danymi
     * @private
     * @returns {string}
     */
    _getDataPath() {
        const userDataPath = app.getPath('userData');
        return path.join(userDataPath, 'board-state.json');
    }

    /**
     * Upewnia się, że katalog z danymi istnieje
     * @private
     */
    _ensureDataDirectory() {
        const dir = path.dirname(this.dataPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    /**
     * Zapisuje stan aplikacji
     * @param {Object} state - stan do zapisania
     * @returns {Promise<boolean>} czy zapis się powiódł
     */
    async saveState(state) {
        try {
            const jsonData = JSON.stringify(state, null, 2);
            fs.writeFileSync(this.dataPath, jsonData, 'utf-8');
            return true;
        } catch (error) {
            console.error('Błąd podczas zapisywania stanu:', error);
            return false;
        }
    }

    /**
     * Wczytuje stan aplikacji
     * @returns {Promise<Object|null>} wczytany stan lub null
     */
    async loadState() {
        try {
            if (fs.existsSync(this.dataPath)) {
                const jsonData = fs.readFileSync(this.dataPath, 'utf-8');
                return JSON.parse(jsonData);
            }
            return null;
        } catch (error) {
            console.error('Błąd podczas wczytywania stanu:', error);
            return null;
        }
    }

    /**
     * Czyści zapisany stan
     * @returns {Promise<boolean>}
     */
    async clearState() {
        try {
            if (fs.existsSync(this.dataPath)) {
                fs.unlinkSync(this.dataPath);
            }
            return true;
        } catch (error) {
            console.error('Błąd podczas czyszczenia stanu:', error);
            return false;
        }
    }
}

module.exports = StorageService;
