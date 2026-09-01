export type Category = 'streaming' | 'software' | 'gym' | 'cloud' | 'news' | 'other' | (string & {});
export type Status = 'active' | 'paused' | 'canceled';
export type Cycle = 'monthly' | 'yearly';

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
  renewal_url: string | null;
  cancel_url: string | null;
  created_at: string;
};

export type UsageLog = { id: string; subscription_id: string; logged_date: string; created_at: string };
export type Notification = { id: string; subscription_id: string; type: 'renewal_reminder' | 'unused_reminder' | 'content_suggestion'; channel: 'email' | 'sms' | 'in_app'; sent_at: string; acknowledged: boolean; metadata: Record<string, unknown> };
export type UserSettings = { id: string; email: string | null; phone: string | null; notify_email: boolean; notify_sms: boolean; reminder_days_before: number; quiet_hours_start: string | null; quiet_hours_end: string | null };
