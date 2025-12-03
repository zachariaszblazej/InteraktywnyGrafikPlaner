/**
 * Klasa reprezentująca kolumnę (dzień tygodnia)
 * Single Responsibility: przechowuje konfigurację kolumny
 */
class Column {
    /**
     * Polskie nazwy dni tygodnia
     */
    static DAYS_OF_WEEK = [
        'Poniedziałek',
        'Wtorek',
        'Środa',
        'Czwartek',
        'Piątek',
        'Sobota',
        'Niedziela'
    ];

    /**
     * @param {number} index - indeks kolumny (0-6)
     * @param {number} requiredWorkers - wymagana liczba pracowników
     */
    constructor(index, requiredWorkers = 1) {
        this.index = index;
        this.name = Column.DAYS_OF_WEEK[index];
        this.requiredWorkers = requiredWorkers;
    }

    /**
     * Sprawdza czy to niedziela
     * @returns {boolean}
     */
    isSunday() {
        return this.index === 6;
    }

    /**
     * Ustawia wymaganą liczbę pracowników
     * @param {number} count 
     */
    setRequiredWorkers(count) {
        if (count > 0) {
            this.requiredWorkers = count;
        }
    }

    /**
     * Serializacja do obiektu
     * @returns {Object}
     */
    toJSON() {
        return {
            index: this.index,
            requiredWorkers: this.requiredWorkers
        };
    }

    /**
     * Deserializacja z obiektu
     * @param {Object} data 
     * @returns {Column}
     */
    static fromJSON(data) {
        return new Column(data.index, data.requiredWorkers);
    }
}

module.exports = Column;
