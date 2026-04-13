import { loadTestEnv } from "./env";

loadTestEnv();

export type TestAccount = {
  email: string;
  password: string;
};

export const reviewerAccount: TestAccount = {
  email: process.env.TEST_REVIEWER_EMAIL ?? "reviewer@gmail.com",
  password: process.env.TEST_REVIEWER_PASSWORD ?? "Reviewer1!",
};

export const adminAccount: TestAccount = {
  email: process.env.TEST_ADMIN_EMAIL ?? "admin@gmail.com",
  password: process.env.TEST_ADMIN_PASSWORD ?? "adminadmin1!",
};
