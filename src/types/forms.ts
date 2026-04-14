export type MyProfileForm = {
  company_name: string;
  is_company_public: boolean;
  name: string;
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
