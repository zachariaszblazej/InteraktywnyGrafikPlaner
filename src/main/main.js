const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const StorageService = require('../services/StorageService');

class MainProcess {
    constructor() {
        this.mainWindow = null;
        this.storageService = new StorageService();
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
