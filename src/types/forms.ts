export type LoginForm = {
  login_email: string;
  login_password: string;
};

export type SignUpForm = {
  signup_name?: string;
  signup_phone?: string;
  signup_email: string;
  signup_password: string;
};

export type MyProfileForm = {
  company_name: string;
  is_company_public: boolean;
  name: string;
  phone: string;
  avatar: string;
};

export type FeedbackFormValues = {
  display_name: string;
  company_name: string;
  is_company_public: boolean;
  avatar: string;
  rating: number;
  summary: string;
  strengths: string;
  questions: string;
  suggestions: string;
  tags: string[];
};
