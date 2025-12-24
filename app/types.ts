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
  betOnAnswerIndex: number;
}

export type GamePhase =
  | 'setup'
  | 'question-selection'
  | 'answering'
  | 'betting'
  | 'results'
  | 'game-over';
