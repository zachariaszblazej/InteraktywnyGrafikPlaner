const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const StorageService = require('../services/StorageService');
const ExcelGenerator = require('../services/ExcelGenerator');

class MainProcess {
    constructor() {
        this.mainWindow = null;
        this.storageService = new StorageService();
        this.excelGenerator = new ExcelGenerator();
    }

    createWindow() {
        // Usuń domyślne menu
        Menu.setApplicationMenu(null);

        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 900,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js')
            },
            title: 'Interaktywny Grafik Planer'
        });

        this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

        // Otwórz DevTools w trybie deweloperskim
        // this.mainWindow.webContents.openDevTools();
    }

    setupIpcHandlers() {
        // Zapisywanie stanu
        ipcMain.handle('save-state', async (event, state) => {
            return this.storageService.saveState(state);
        });

        // Wczytywanie stanu
        ipcMain.handle('load-state', async () => {
            return this.storageService.loadState();
        });

        // Generowanie pliku Excel
        ipcMain.handle('generate-excel', async (event, boardState) => {
            try {
                // Wygeneruj domyślną nazwę pliku
                const defaultFileName = this.excelGenerator.generateDefaultFileName(
                    boardState.year,
                    boardState.weekNumber
                );

                // Pokaż dialog zapisu pliku
                const result = await dialog.showSaveDialog(this.mainWindow, {
                    title: 'Zapisz grafik jako Excel',
                    defaultPath: `${defaultFileName}.xlsx`,
                    filters: [
                        { name: 'Pliki Excel', extensions: ['xlsx'] }
                    ]
                });

                if (result.canceled || !result.filePath) {
                    return { success: false, canceled: true };
                }

                // Wygeneruj plik Excel
                await this.excelGenerator.generateExcel(boardState, result.filePath);

                return { success: true, filePath: result.filePath };
            } catch (error) {
                console.error('Błąd podczas generowania Excel:', error);
                return { success: false, error: error.message };
            }
        });
    }

    initialize() {
        app.whenReady().then(() => {
            this.setupIpcHandlers();
            this.createWindow();

            app.on('activate', () => {
                if (BrowserWindow.getAllWindows().length === 0) {
                    this.createWindow();
                }
            });
        });

        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });
    }
}

const mainProcess = new MainProcess();
mainProcess.initialize();
