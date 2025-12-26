export interface Question {
  question: string;
  answer: number;
  labels: string[];
}

export interface Player {
  id: string;
  name: string;
  score: number;
}

export interface PlayerAnswer {
  playerId: string;
  answer: number;
}

export interface PlayerBet {
  playerId: string;
  betOnSlotIndices: number[]; // Indices of betting board slots (0-7)
}

export type GamePhase =
  | 'setup'
  | 'question-selection'
  | 'answering'
  | 'betting'
  | 'results'
  | 'game-over';
