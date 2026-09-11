export type Category = 'streaming' | 'software' | 'gym' | 'cloud' | 'news' | 'other' | (string & {});
export type Status = 'active' | 'paused' | 'canceled';
export type Cycle = 'monthly' | 'yearly';
export type AutopayStatus = 'running' | 'paused' | 'deleted';

export type SharedMember = {
  id: string;
  name: string;
  email?: string;
  share?: number;
  share_amount?: number;
  paid?: boolean;
  paid_at?: string;
};

export type PriceChange = {
  date?: string;
  changed_at?: string;
  old_cost?: number;
  previous_cost?: number;
  new_cost: number;
  diff?: number;
  currency?: string;
  percentage: number;
  note?: string;
};

export type Subscription = {
  id: string;
  user_id: string;
  service_name: string;
  category: Category;
  cost: number;
  currency: string;
  billing_cycle: Cycle;
  next_renewal_date: string;
  status: Status;
  autopay_status?: AutopayStatus;
  renewal_url: string | null;
  cancel_url: string | null;
  created_at: string;
  // Shared plans
  is_shared?: boolean;
  split_count?: number;
  my_share?: number | null;
  shared_members?: SharedMember[];
  // Price hike tracking
  price_history?: PriceChange[];
};

export type UsageLog = { id: string; subscription_id: string; logged_date: string; created_at: string };
export type Notification = { id: string; subscription_id: string; type: 'renewal_reminder' | 'unused_reminder' | 'content_suggestion'; channel: 'email' | 'sms' | 'in_app'; sent_at: string; acknowledged: boolean; metadata: Record<string, unknown> };
export type UserSettings = {
  id: string;
  email: string | null;
  phone: string | null;
  notify_email: boolean;
  notify_sms: boolean;
  reminder_days_before: number;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  monthly_budget_cap?: number | null;
  annual_budget_cap?: number | null;
};
