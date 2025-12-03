# InteraktywnyGrafikPlaner

Aplikacja desktopowa do interaktywnego planowania grafików pracy, napisana w Electron.

## Funkcjonalności

- **Tablica kafelkowa** - 7 kolumn (dni tygodnia) × n wierszy (pracownicy)
- **3 stany kafelków** - A (dostępny), Praca, U (urlop) - przełączane kliknięciem
- **Konfigurowalny nagłówek wierszy** - dowolna nazwa pracownika
- **Wymagana liczba pracowników** - rozwijana lista dla każdego dnia
- **Walidacja kolumn**:
  - Poniedziałek-Sobota: wymagana liczba lub +1
  - Niedziela: dokładnie wymagana liczba
  - Wizualne oznaczenie poprawnych kolumn (zielona ramka)
- **Filtrowanie wierszy** - checkbox do wykluczania z wyliczeń
- **Undo/Redo** - Ctrl+Z / Ctrl+Y
- **Persystencja** - automatyczne zapisywanie stanu

## Technologie

- Electron 28.x
- Vanilla JavaScript (ES6+)
- CSS3 (zmienne CSS, Flexbox)
- Architektura SOLID

## Struktura projektu

```
src/
├── main/
│   ├── main.js          # Główny proces Electron
│   └── preload.js       # Preload script (bezpieczny most IPC)
├── models/
│   ├── TileState.js     # Enum stanów kafelka
│   ├── Tile.js          # Model kafelka
│   ├── Row.js           # Model wiersza
│   ├── Column.js        # Model kolumny (dzień tygodnia)
│   └── Board.js         # Model tablicy
├── services/
│   ├── StorageService.js    # Persystencja danych
│   └── HistoryManager.js    # System Undo/Redo
└── renderer/
    ├── index.html       # Główny widok
    ├── styles.css       # Style aplikacji
    └── renderer.js      # Logika UI
```

## Instalacja

```bash
npm install
```

## Uruchomienie

```bash
npm start
```

## Skróty klawiszowe

| Skrót | Akcja |
|-------|-------|
| Ctrl+Z | Cofnij |
| Ctrl+Y | Ponów |

## Licencja

MIT
