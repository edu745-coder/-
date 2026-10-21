/**
 * Curated Korean Janggi Tactics Puzzles (장기 묘수풀이)
 * Endgame checkmate puzzles to practice tactical vision (외통수 찾기).
 */

import { Board, Side, Position } from './janggi.ts';

export interface JanggiPuzzle {
  id: string;
  title: string;
  difficulty: '초급' | '중급' | '고급';
  description: string;
  side: Side;
  board: Board;
  solutionMoves: { from: Position; to: Position }[];
  hint: string;
  explanation: string;
}

function emptyBoard(): Board {
  return Array(10)
    .fill(null)
    .map(() => Array(9).fill(null));
}

export const JANGGI_PUZZLES: JanggiPuzzle[] = [
  {
    id: 'puzzle_1',
    title: '1. 궁성 침투 외통수',
    difficulty: '초급',
    description: '초(楚)의 차(車)를 사용하여 1수 만에 한(漢)의 궁을 외통(체크메이트)시키세요.',
    side: 'cho',
    hint: '차는 상대 궁성 안에서 대각선으로도 이동할 수 있습니다.',
    explanation: '장기만의 특별한 규칙! 차(車)가 상대 궁성 모서리에 진입하면 대각선을 타고 단숨에 장군을 부를 수 있습니다.',
    board: (() => {
      const b = emptyBoard();
      // Han King in palace center
      b[1][4] = { id: 'h_gung', type: 'GUNG', side: 'han' };
      b[0][3] = { id: 'h_sa1', type: 'SA', side: 'han' };
      b[0][5] = { id: 'h_sa2', type: 'SA', side: 'han' };
      // Cho pieces positioned to strike
      b[2][3] = { id: 'c_cha1', type: 'CHA', side: 'cho' }; // at palace entrance corner
      b[7][4] = { id: 'c_po1', type: 'PO', side: 'cho' };
      b[8][4] = { id: 'c_gung', type: 'GUNG', side: 'cho' };
      return b;
    })(),
    solutionMoves: [
      { from: { r: 2, c: 3 }, to: { r: 0, c: 5 } }, // Chariot slides diagonally across center to opposite corner, checkmating!
    ],
  },
  {
    id: 'puzzle_2',
    title: '2. 마(馬)의 멱을 이용한 외통수',
    difficulty: '초급',
    description: '초(楚)의 차례입니다. 마와 포의 연계를 통해 1수 만에 외통수를 만드세요.',
    side: 'cho',
    hint: '마의 행마는 멱(길목)이 트여있을 때 강력한 날일자(日) 공격을 펼칩니다.',
    explanation: '마의 멱이 열려있어 상대 궁의 탈출로를 완벽하게 차단하며 외통수를 완성했습니다.',
    board: (() => {
      const b = emptyBoard();
      b[0][4] = { id: 'h_gung', type: 'GUNG', side: 'han' };
      b[1][3] = { id: 'h_sa1', type: 'SA', side: 'han' };
      b[1][5] = { id: 'h_sa2', type: 'SA', side: 'han' };
      // Cho pieces
      b[2][3] = { id: 'c_ma1', type: 'MA', side: 'cho' };
      b[4][4] = { id: 'c_po1', type: 'PO', side: 'cho' };
      b[8][4] = { id: 'c_gung', type: 'GUNG', side: 'cho' };
      return b;
    })(),
    solutionMoves: [
      { from: { r: 2, c: 3 }, to: { r: 0, c: 2 } }, // Ma attacks
    ],
  },
  {
    id: 'puzzle_3',
    title: '3. 포(包)의 다리를 놓는 묘수',
    difficulty: '중급',
    description: '포는 기물 하나를 뛰어넘어야 합니다. 상대 기물을 다리 삼아 1수 만에 외통을 치세요.',
    side: 'cho',
    hint: '포는 포를 넘을 수 없지만, 다른 기물은 좋은 다리가 됩니다.',
    explanation: '포의 특성인 도약 공격을 이용하여 상대 궁이 피할 곳이 없도록 일격을 가했습니다.',
    board: (() => {
      const b = emptyBoard();
      b[0][4] = { id: 'h_gung', type: 'GUNG', side: 'han' };
      b[1][4] = { id: 'h_sa1', type: 'SA', side: 'han' }; // Guard serves as bridge!
      b[0][3] = { id: 'h_cha1', type: 'CHA', side: 'han' };
      // Cho pieces
      b[5][4] = { id: 'c_po1', type: 'PO', side: 'cho' };
      b[1][7] = { id: 'c_cha1', type: 'CHA', side: 'cho' }; // Controlling rank 1
      b[8][4] = { id: 'c_gung', type: 'GUNG', side: 'cho' };
      return b;
    })(),
    solutionMoves: [
      { from: { r: 5, c: 4 }, to: { r: 0, c: 4 } }, // Po jumps over Sa at (1,4) to capture King or checkmate at (0,4)
    ],
  },
  {
    id: 'puzzle_4',
    title: '4. 졸(卒)의 궁성 돌파',
    difficulty: '중급',
    description: '한의 궁성에 깊숙이 침투한 졸을 전진시켜 외통수를 만드세요.',
    side: 'cho',
    hint: '상대 궁성 안에서는 졸도 대각선으로 전진할 수 있습니다.',
    explanation: '장기에서 전진한 졸은 대차(차의 교환)보다 무섭다는 격언처럼, 궁성 안에서 결정타를 날렸습니다.',
    board: (() => {
      const b = emptyBoard();
      b[1][4] = { id: 'h_gung', type: 'GUNG', side: 'han' };
      b[0][3] = { id: 'h_sa1', type: 'SA', side: 'han' };
      b[0][5] = { id: 'h_sa2', type: 'SA', side: 'han' };
      // Cho
      b[2][3] = { id: 'c_jol1', type: 'JOL', side: 'cho' };
      b[3][5] = { id: 'c_cha1', type: 'CHA', side: 'cho' };
      b[8][4] = { id: 'c_gung', type: 'GUNG', side: 'cho' };
      return b;
    })(),
    solutionMoves: [
      { from: { r: 2, c: 3 }, to: { r: 1, c: 4 } }, // Jol captures King or checkmates
    ],
  },
  {
    id: 'puzzle_5',
    title: '5. 양차 합공의 결정타',
    difficulty: '고급',
    description: '양차(2개의 車)를 조율하여 상대 궁의 도주로를 완벽 봉쇄하세요.',
    side: 'cho',
    hint: '한 차가 길목을 막고, 다른 차가 급소를 타격합니다.',
    explanation: '완벽한 양차 연계로 한의 궁이 어느 곳으로도 피할 수 없는 완승을 거두었습니다.',
    board: (() => {
      const b = emptyBoard();
      b[0][5] = { id: 'h_gung', type: 'GUNG', side: 'han' };
      b[0][4] = { id: 'h_sa1', type: 'SA', side: 'han' };
      b[1][4] = { id: 'h_sa2', type: 'SA', side: 'han' };
      // Cho pieces
      b[1][8] = { id: 'c_cha1', type: 'CHA', side: 'cho' }; // Controlling rank 1
      b[6][5] = { id: 'c_cha2', type: 'CHA', side: 'cho' }; // Advancing on file 5
      b[8][4] = { id: 'c_gung', type: 'GUNG', side: 'cho' };
      return b;
    })(),
    solutionMoves: [
      { from: { r: 6, c: 5 }, to: { r: 0, c: 5 } }, // Cha penetrates directly to King square
    ],
  },
];
