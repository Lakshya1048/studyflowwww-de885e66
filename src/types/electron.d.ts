/** Electron IPC bridge exposed via contextBridge in preload.js */
export interface ElectronAPI {
  /** List subject folders inside D:\StudyFlow\ */
  getSubjects: () => Promise<string[]>;
  /** Create a new subject folder */
  createSubject: (name: string) => Promise<void>;
  /** Delete a subject folder and all its contents */
  deleteSubject: (name: string) => Promise<void>;
  /** List PDF files inside a subject folder */
  getPdfs: (subject: string) => Promise<string[]>;
  /** Copy a PDF file into a subject folder, returns the saved file path */
  addPdf: (subject: string, sourcePath: string) => Promise<string>;
  /** Delete a PDF from a subject folder */
  deletePdf: (subject: string, fileName: string) => Promise<void>;
  /** Get the full local path for a PDF */
  getPdfPath: (subject: string, fileName: string) => Promise<string>;
  /** Open a file in the OS default application */
  openFile: (filePath: string) => Promise<void>;
  /** Show a native file open dialog, returns selected file paths */
  showOpenDialog: (options: {
    filters?: { name: string; extensions: string[] }[];
    properties?: string[];
  }) => Promise<string[]>;
}

declare global {
  interface Window {
    api?: ElectronAPI;
  }
}
