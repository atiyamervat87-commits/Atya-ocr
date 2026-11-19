export interface User {
  id: number;
  full_name: string;
  phone: string;
  email?: string;
  is_active: number; // 0 or 1
  role: 'client' | 'admin';
  balance: number;
  activation_request?: ActivationRequest | null;
}

export interface ActivationRequest {
  id: number;
  user_id: number;
  amount: number;
  wallet_number: string;
  transaction_reference: string;
  receipt_image?: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'needs_review';
  admin_notes?: string;
  reviewed_by?: number;
  reviewed_at?: string;
  created_at: string;
  full_name?: string;
  phone?: string;
}

export interface CreditTransaction {
  id: number;
  user_id: number;
  amount: number;
  type: string;
  service_name?: string;
  description: string;
  balance_before: number;
  balance_after: number;
  created_at: string;
}

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
  status: 'ناجح' | 'فاشل' | 'متعذر' | 'PLANNED' | 'IMPLEMENTED' | 'TESTED' | 'FAILED' | 'BLOCKED';
  details: string;
}
