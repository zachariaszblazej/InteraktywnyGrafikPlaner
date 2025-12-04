const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script - bezpieczny most między procesem głównym a rendererem
 * Zgodnie z zasadą Separation of Concerns
 */
contextBridge.exposeInMainWorld('electronAPI', {
    saveState: (state) => ipcRenderer.invoke('save-state', state),
    loadState: () => ipcRenderer.invoke('load-state'),
    generateExcel: (boardState) => ipcRenderer.invoke('generate-excel', boardState)
});
