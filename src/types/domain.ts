export type UserRole = 'buyer' | 'amateur' | 'professional' | 'admin';
export type AccountStatus = 'pending' | 'active' | 'suspended' | 'disabled';
export type ProfessionalApplicationStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export type UserProfile = {
  id: string;
  display_name: string;
  role: UserRole;
  account_status: AccountStatus;
  avatar_path: string | null;
  bio: string | null;
  district: string | null;
  phone: string | null;
  phone_visible: boolean;
  created_at: string;
  updated_at: string;
};

export function canAccessApp(profile: UserProfile) {
  return profile.account_status === 'active';
}

export type ProfessionalApproval = {
  status: ProfessionalApplicationStatus;
  license_expires_at: string | null;
};

export function canCreateAuctions(profile: UserProfile, application: ProfessionalApproval | null = null, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Nicosia', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const date = ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-');
  return profile.role === 'professional' && canAccessApp(profile) && application?.status === 'approved'
    && !!application.license_expires_at && application.license_expires_at >= date;
}

export function canReviewProfessionalApplications(profile: UserProfile) {
  return profile.role === 'admin' && profile.account_status === 'active';
}
