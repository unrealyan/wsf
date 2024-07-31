export {}
declare global {
    interface Window {
        showSaveFilePicker(options?: { suggestedName?: string }): Promise<FileSystemFileHandle>;
    }
}