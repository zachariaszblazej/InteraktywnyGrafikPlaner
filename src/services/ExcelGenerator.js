const ExcelJS = require('exceljs');
const path = require('path');

/**
 * Klasa odpowiedzialna za generowanie plików Excel na podstawie szablonu
 * Single Responsibility: tylko generowanie Excel
 */
class ExcelGenerator {
    constructor() {
        this.templatePath = path.join(__dirname, '../templates/GrafikTemplate.xlsx');
        
        // Niemieckie nazwy miesięcy
        this.germanMonths = [
            'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
            'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
        ];
    }

    /**
     * Generuje plik Excel na podstawie stanu tablicy
     * @param {Object} boardState - stan tablicy z danymi pracowników
     * @param {string} outputPath - ścieżka do zapisu pliku
     * @returns {Promise<boolean>} - czy operacja się powiodła
     */
    async generateExcel(boardState, outputPath) {
        try {
            // Wczytaj szablon
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(this.templatePath);

            const worksheet = workbook.worksheets[0];

            // Oblicz daty dla wybranego tygodnia
            const weekDates = this.getWeekDates(boardState.year, boardState.weekNumber);

            // Wypełnij nagłówek/stopkę z miesiącem i rokiem
            this.fillHeaderFooter(worksheet, weekDates);

            // Wypełnij daty w nagłówku (C2:I2)
            this.fillHeaderDates(worksheet, weekDates);

            // Wypełnij sekcje pracowników
            this.fillEmployeeSections(worksheet, boardState.rows);

            // Zapisz plik z zachowaniem formatowania
            await workbook.xlsx.writeFile(outputPath);

            return true;
        } catch (error) {
            console.error('Błąd podczas generowania Excel:', error);
            throw error;
        }
    }

    /**
     * Pobiera daty dla danego tygodnia w roku (ISO 8601)
     * @param {number} year - rok
     * @param {number} weekNumber - numer tygodnia (1-53)
     * @returns {Date[]} tablica 7 dat (pon-nd)
     */
    getWeekDates(year, weekNumber) {
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
     * Formatuje datę jako DD.MM.YYYY
     * @param {Date} date 
     * @returns {string}
     */
    formatDateFull(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }

    /**
     * Formatuje datę jako DD.MM
     * @param {Date} date 
     * @returns {string}
     */
    formatDateShort(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${day}.${month}`;
    }

    /**
     * Wypełnia nagłówek datami (komórki C2:I2)
     * @param {ExcelJS.Worksheet} worksheet 
     * @param {Date[]} weekDates 
     */
    fillHeaderDates(worksheet, weekDates) {
        // C2:I2 odpowiada kolumnom 3-9
        const startColumn = 3; // C = 3

        weekDates.forEach((date, index) => {
            const cell = worksheet.getCell(2, startColumn + index);
            cell.value = this.formatDateFull(date);
        });
    }

    /**
     * Wypełnia nagłówek/stopkę Excel z miesiącem i rokiem
     * Format: "Dienstplan Glanz Reinigungs-Service GmbH\n[month] [year]"
     * @param {ExcelJS.Worksheet} worksheet 
     * @param {Date[]} weekDates 
     */
    fillHeaderFooter(worksheet, weekDates) {
        const monday = weekDates[0];
        const sunday = weekDates[6];

        // Pobierz nazwy miesięcy
        const monthText = this.getMonthText(monday, sunday);
        const year = this.getYearText(monday, sunday);

        // Ustaw nagłówek środkowy z czcionką 14pt
        // &14 = rozmiar czcionki 14, &"-,Bold" = pogrubienie (opcjonalnie)
        // &C = środek
        const headerText = `&C&14Dienstplan Glanz Reinigungs-Service GmbH\n${monthText} ${year}`;

        // ExcelJS używa headerFooter z oddFirst, oddHeader itp.
        worksheet.headerFooter = {
            ...worksheet.headerFooter,
            oddHeader: headerText,
            evenHeader: headerText,
            firstHeader: headerText
        };
    }

    /**
     * Pobiera tekst miesiąca dla nagłówka
     * Jeśli tydzień jest na przełomie miesięcy, zwraca "Miesiąc1/Miesiąc2"
     * @param {Date} monday - poniedziałek tygodnia
     * @param {Date} sunday - niedziela tygodnia
     * @returns {string}
     */
    getMonthText(monday, sunday) {
        const mondayMonth = monday.getMonth();
        const sundayMonth = sunday.getMonth();

        if (mondayMonth === sundayMonth) {
            return this.germanMonths[mondayMonth];
        } else {
            return `${this.germanMonths[mondayMonth]}/${this.germanMonths[sundayMonth]}`;
        }
    }

    /**
     * Pobiera tekst roku dla nagłówka
     * Jeśli tydzień jest na przełomie lat, zwraca "Rok1/Rok2"
     * @param {Date} monday - poniedziałek tygodnia
     * @param {Date} sunday - niedziela tygodnia
     * @returns {string}
     */
    getYearText(monday, sunday) {
        const mondayYear = monday.getFullYear();
        const sundayYear = sunday.getFullYear();

        if (mondayYear === sundayYear) {
            return String(mondayYear);
        } else {
            return `${mondayYear}/${sundayYear}`;
        }
    }

    /**
     * Wypełnia sekcje pracowników
     * Pierwsza sekcja: A4:J6, kolejne: A7:J9, A10:J12 itd.
     * @param {ExcelJS.Worksheet} worksheet 
     * @param {Array} rows - lista pracowników
     */
    fillEmployeeSections(worksheet, rows) {
        const FIRST_SECTION_START_ROW = 4;
        const SECTION_HEIGHT = 3; // każda sekcja ma 3 wiersze
        const NAME_COLUMN = 1; // kolumna A
        const DAYS_START_COLUMN = 3; // kolumna C

        rows.forEach((employee, employeeIndex) => {
            // Oblicz wiersz początkowy dla tej sekcji
            const sectionStartRow = FIRST_SECTION_START_ROW + (employeeIndex * SECTION_HEIGHT);

            // Wpisz nazwę pracownika do komórki A{sectionStartRow}
            const nameCell = worksheet.getCell(sectionStartRow, NAME_COLUMN);
            nameCell.value = employee.header || '';

            // Wypełnij dni tygodnia (C:I w pierwszym wierszu sekcji)
            employee.tiles.forEach((tile, dayIndex) => {
                const cell = worksheet.getCell(sectionStartRow, DAYS_START_COLUMN + dayIndex);
                cell.value = this.getTileValue(tile.state);
            });
        });
    }

    /**
     * Konwertuje stan kafelka na wartość do Excela
     * @param {string} tileState - stan kafelka (A, Praca, U)
     * @returns {string} wartość do wpisania w Excelu
     */
    getTileValue(tileState) {
        switch (tileState) {
            case 'A':
                return 'A';
            case 'Praca':
                return '9.00-17.30';
            case 'U':
                return 'U';
            default:
                return '';
        }
    }

    /**
     * Generuje domyślną nazwę pliku
     * Format: "{numer_tygodnia}KW {DD.MM poniedziałek}-{DD.MM niedziela}"
     * @param {number} year - rok
     * @param {number} weekNumber - numer tygodnia
     * @returns {string} nazwa pliku bez rozszerzenia
     */
    generateDefaultFileName(year, weekNumber) {
        const weekDates = this.getWeekDates(year, weekNumber);
        const mondayDate = this.formatDateShort(weekDates[0]);
        const sundayDate = this.formatDateShort(weekDates[6]);

        return `${weekNumber}KW ${mondayDate}-${sundayDate}`;
    }
}

module.exports = ExcelGenerator;
