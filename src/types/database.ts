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

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, "id" | "created_at">;
        Update: Partial<Omit<Transaction, "id" | "user_id" | "created_at">>;
      };
      debts: {
        Row: Debt;
        Insert: Omit<Debt, "id" | "created_at">;
        Update: Partial<Omit<Debt, "id" | "user_id" | "created_at">>;
      };
    };
  };
};
