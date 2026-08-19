export type TransactionType = "income" | "expense";
export type DebtType = "owe" | "lend";
export type WalletType = "bank" | "ewallet" | "cash" | "credit_card" | "paylater" | "investment" | "gold";

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string | null;
  date: string;
  wallet_id?: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  type: DebtType;
  person_name: string;
  amount: number;
  description: string | null;
  due_date: string | null;
  is_paid: boolean;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  month: string;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string;
  color: string;
  is_completed: boolean;
  updated_at: string;
  created_at: string;
}

export interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  category: string;
  due_day: number;
  is_paid: boolean;
  last_paid_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  currency: string;
  date_format: string;
  language: string;
  privacy_mode: boolean;
  avatar_url: string | null;
  updated_at?: string;
}

export interface WalletItem {
  id: string;
  user_id: string;
  name: string;
  type: WalletType;
  balance: number;
  gold_grams: number;
  color: string;
  icon: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transfer {
  id: string;
  user_id: string;
  from_wallet_id: string;
  to_wallet_id: string;
  amount: number;
  note: string | null;
  date: string;
  created_at: string;
}
