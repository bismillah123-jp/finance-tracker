export type TransactionType = "income" | "expense";
export type DebtType = "owe" | "lend";

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string | null;
  date: string;
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
  month: string; // "YYYY-MM"
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
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, "created_at">; Update: Partial<Omit<Profile, "id" | "created_at">>; };
      transactions: { Row: Transaction; Insert: Omit<Transaction, "id" | "created_at">; Update: Partial<Omit<Transaction, "id" | "user_id" | "created_at">>; };
      debts: { Row: Debt; Insert: Omit<Debt, "id" | "created_at">; Update: Partial<Omit<Debt, "id" | "user_id" | "created_at">>; };
      budgets: { Row: Budget; Insert: Omit<Budget, "id" | "created_at">; Update: Partial<Omit<Budget, "id" | "user_id" | "created_at">>; };
      savings_goals: { Row: SavingsGoal; Insert: Omit<SavingsGoal, "id" | "created_at" | "updated_at">; Update: Partial<Omit<SavingsGoal, "id" | "user_id" | "created_at">>; };
      bills: { Row: Bill; Insert: Omit<Bill, "id" | "created_at">; Update: Partial<Omit<Bill, "id" | "user_id" | "created_at">>; };
      user_settings: { Row: UserSettings; Insert: Omit<UserSettings, "id" | "created_at" | "updated_at">; Update: Partial<Omit<UserSettings, "id" | "user_id" | "created_at">>; };
    };
  };
};
