export interface DocumentResult {
  id: string;
  fileName: string;
  text: string;
  pagesCount: number;
  fileSize?: string;
  createdAt: string;
  mimeType?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export interface TestItem {
  id: number;
  name: string;
  status: 'ناجح' | 'فاشل' | 'متعذر';
  details: string;
}
