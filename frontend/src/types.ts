export type Plan = "FREE" | "PREMIUM" | "UNIVERSITY";
export type Role = "STUDENT" | "MENTOR" | "UNI_ADMIN" | "ADMIN";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  plan: Plan;
  university: { id: string; name: string; shortName: string; monthlyCredits: number } | null;
  career: string | null;
  cycle: number | null;
  onboarded: boolean;
  darkMode: boolean | null;
  credits: number;
  streak: number;
  premiumSince: string | null;
  premiumRenewAt: string | null;
  questionsToday: number;
  questionsLeft: number | null;
}

export interface University {
  id: string;
  name: string;
  shortName: string;
  domain: string;
}

export interface Course {
  id: string;
  name: string;
  emoji: string;
  syllabus: string[];
  rubric: string[];
  covered: string[];
}

export interface Question {
  id: string;
  courseId: string;
  text: string;
  topic: string;
  steps: string[];
  done: boolean[];
  rubricHint: string;
  checkQ: string;
  attempts: number;
  solved: boolean;
  source: string;
  needMentor: boolean;
  createdAt: string;
}

export interface MentorInfo {
  id: string;
  name: string;
  headline: string;
  courses: string[];
  rating: number;
  userId: string | null;
}

export interface Message {
  id: string;
  from: "student" | "mentor";
  text: string;
  createdAt: string;
}

export interface Mentoring {
  id: string;
  topic: string;
  urgency: string;
  minutes: number;
  offerPrice: number;
  finalPrice: number;
  creditsUsed: number;
  status: "SEARCHING" | "MATCHED" | "IN_ROOM" | "DONE" | "CANCELLED";
  offers: { mentorId: string; price: number; eta: number; mentor: MentorInfo | null }[];
  mentor: MentorInfo | null;
  course: { id: string; name: string; emoji: string } | null;
  messages?: Message[];
  rating: number | null;
  createdAt: string;
  streak?: number | null;
}
