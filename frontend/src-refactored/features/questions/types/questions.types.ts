/**
 * Questions Types
 * 
 * Type definitions for Mercado Livre questions
 */

export type QuestionStatus = 'unanswered' | 'answered' | 'closed' | 'deleted';

export interface QuestionBuyer {
  id: string;
  nickname: string;
  email?: string;
}

export interface QuestionItem {
  id: string;
  title: string;
  thumbnail: string;
  permalink: string;
  itemId: string;
}

export interface QuestionDetail {
  id: string;
  accountId: string;
  question: string;
  answer?: string;
  status: QuestionStatus;
  buyer: QuestionBuyer;
  item: QuestionItem;
  createdAt: string;
  answeredAt?: string;
  deletedFromSite: boolean;
  holding: boolean;
}

export interface QuestionListItem {
  id: string;
  accountId: string;
  question: string;
  answer?: string;
  status: QuestionStatus;
  buyerNickname: string;
  buyerId: string;
  itemTitle: string;
  itemThumbnail: string;
  createdAt: string;
}

export interface QuestionFilters {
  accountId?: string;
  status?: QuestionStatus;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface QuestionStats {
  total: number;
  unanswered: number;
  answered: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
}

export interface SendAnswerPayload {
  questionId: string;
  text: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  text: string;
  createdAt: string;
}
