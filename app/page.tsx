'use client';

import { useState, useEffect } from 'react';
import { useGame } from '@/lib/game-engine/react';
import type { Question } from '@/lib/game-engine/react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function Home() {
  // Load questions from JSON
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    fetch(`${basePath}/questions.json`)
      .then(res => res.json())
      .then((data: Question[]) => {
        setAllQuestions(data);
        setIsLoading(false);
      });
  }, []);

  // Initialize game engine with loaded questions
  const game = useGame(allQuestions);
  const { phase, players, currentQuestion, currentRound, totalRounds, state, actions } = game;

  // UI-only state
  const [newPlayerName, setNewPlayerName] = useState('');
  const [currentPlayerAnswerInput, setCurrentPlayerAnswerInput] = useState<Record<string, string>>({});
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  // Sync selected labels with game engine
  useEffect(() => {
    if (!isLoading) {
      actions.setQuestionLabels(selectedLabels);
    }
  }, [selectedLabels, isLoading, actions]);

  // UI helper functions
  const toggleLabel = (label: string) => {
    setSelectedLabels(prev =>
      prev.includes(label)
        ? prev.filter(l => l !== label)
        : [...prev, label]
    );
  };

  const addPlayer = () => {
    if (newPlayerName.trim()) {
      actions.addPlayer(newPlayerName.trim());
      setNewPlayerName('');
    }
  };

  const handleStartGame = () => {
    if (state.filteredQuestions.length === 0) {
      alert('¡No hay preguntas disponibles con las etiquetas seleccionadas!');
      return;
    }
    if (players.length < 2) {
      alert('¡Se necesitan al menos 2 jugadores!');
      return;
    }
    actions.startGame();
  };

  // Check if all players have valid answers filled in
  const allAnswersFilled = () => {
    return players.every(player => {
      const answerStr = currentPlayerAnswerInput[player.id];
      if (!answerStr || answerStr.trim() === '') return false;
      const answer = parseFloat(answerStr);
      return !isNaN(answer) && answer >= 0;
    });
  };

  const handleFinishAnswering = () => {
    if (!allAnswersFilled()) {
      alert('¡Todos los jugadores deben ingresar una respuesta válida!');
      return;
    }
    
    // Submit all answers at once
    players.forEach(player => {
      const answer = parseFloat(currentPlayerAnswerInput[player.id]);
      actions.submitAnswer(player.id, answer);
    });
    
    // Clear input state and proceed to betting
    setCurrentPlayerAnswerInput({});
    actions.finishAnswering();
  };

  const handleFinishBetting = () => {
    if (!actions.canFinishBetting()) {
      alert('¡Todos los jugadores deben colocar 2 apuestas!');
      return;
    }
    actions.finishBetting();
  };

  const getWinningAnswerInfo = () => {
    if (!currentQuestion || state.playerAnswers.length === 0) return null;

    const sortedAnswers = [...state.playerAnswers].sort((a, b) => a.answer - b.answer);
    const validAnswers = sortedAnswers.filter(a => a.answer <= currentQuestion.answer);
    const winningAnswer = validAnswers.length > 0
      ? validAnswers[validAnswers.length - 1]
      : sortedAnswers[0];

    const winningIndex = sortedAnswers.findIndex(
      a => a.playerId === winningAnswer.playerId && a.answer === winningAnswer.answer
    );

    return { winningAnswer, winningIndex, sortedAnswers };
  };

  const ScoreboardGraph = () => {
    if (players.length === 0 || Object.keys(state.scoreHistory).length === 0) return null;

    const playerColors = [
      'hsl(0, 84%, 60%)',
      'hsl(217, 91%, 60%)',
      'hsl(142, 76%, 36%)',
      'hsl(38, 92%, 50%)',
      'hsl(280, 77%, 60%)',
      'hsl(340, 82%, 52%)',
    ];

    const rounds = Math.max(...Object.values(state.scoreHistory).map(h => h.length));
    const chartData = Array.from({ length: rounds }, (_, i) => {
      const dataPoint: any = { round: i };
      players.forEach((player, idx) => {
        dataPoint[player.name] = state.scoreHistory[player.id]?.[i] || 0;
      });
      return dataPoint;
    });

    const chartConfig: any = {};
    players.forEach((player, idx) => {
      chartConfig[player.name] = {
        label: player.name,
        color: playerColors[idx % playerColors.length],
      };
    });

    return (
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Tabla de Puntuaciones</h2>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="round"
              label={{ value: 'Ronda', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              label={{ value: 'Puntuación', angle: -90, position: 'insideLeft' }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {players.map((player, idx) => (
              <Line
                key={player.id}
                type="monotone"
                dataKey={player.name}
                stroke={playerColors[idx % playerColors.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl">Cargando...</p>
      </div>
    );
  }

  const availableLabels = actions.getAvailableLabels();

  // Setup Phase
  if (phase === 'setup') {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-center">Wits & Wagers</h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Jugadores</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
              placeholder="Nombre del jugador"
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addPlayer}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Agregar
            </button>
          </div>
          <div className="space-y-2">
            {players.map(player => (
              <div key={player.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">{player.name}</span>
                <button
                  onClick={() => actions.removePlayer(player.id)}
                  className="px-4 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
          {players.length < 2 && (
            <p className="text-sm text-gray-600 mt-2">Se necesitan al menos 2 jugadores</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Rondas</h2>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min="3"
              max="15"
              value={totalRounds}
              onChange={(e) => actions.setRoundsToPlay(parseInt(e.target.value) || 7)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
            />
            <span className="text-gray-700">rondas para jugar</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Filtrar Preguntas por Etiqueta</h2>
          <div className="flex flex-wrap gap-2">
            {availableLabels.map(label => (
              <button
                key={label}
                onClick={() => toggleLabel(label)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedLabels.includes(label)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-4">
            {state.filteredQuestions.length} preguntas disponibles
            {selectedLabels.length > 0 && ` (filtradas por: ${selectedLabels.join(', ')})`}
          </p>
        </div>

        <button
          onClick={handleStartGame}
          disabled={players.length < 2 || state.filteredQuestions.length < totalRounds}
          className="w-full px-6 py-4 bg-green-500 text-white text-xl font-bold rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Comenzar Juego
        </button>
      </div>
    );
  }

  // Answering Phase
  if (phase === 'answering') {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="mb-4 text-center">
          <p className="text-lg text-gray-600">
            Ronda {currentRound + 1} de {totalRounds} • Bono de ronda: +{currentRound}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-3xl font-bold mb-4 text-center">{currentQuestion?.question}</h2>

          <div className="space-y-4 mt-6">
            {players.map(player => (
              <div key={player.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <span className="font-medium flex-1">{player.name}</span>
                  <input
                    type="number"
                    value={currentPlayerAnswerInput[player.id] || ''}
                    onChange={(e) => setCurrentPlayerAnswerInput(prev => ({
                      ...prev,
                      [player.id]: e.target.value
                    }))}
                    placeholder="Tu respuesta"
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleFinishAnswering}
            disabled={!allAnswersFilled()}
            className="w-full mt-6 px-6 py-3 bg-green-500 text-white text-lg font-bold rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Continuar a Apuestas
          </button>
        </div>
      </div>
    );
  }

  // Betting Phase
  if (phase === 'betting') {
    const sortedAnswers = actions.getSortedAnswers();

    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="mb-4 text-center">
          <p className="text-lg text-gray-600">
            Ronda {currentRound + 1} de {totalRounds}
          </p>
          <h2 className="text-2xl font-bold mt-2">{currentQuestion?.question}</h2>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">Respuestas (ordenadas):</h3>
          <div className="grid grid-cols-1 gap-3">
            {sortedAnswers.map((answer, index) => {
              const player = players.find(p => p.id === answer.playerId);
              return (
                <div key={index} className="p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                  <span className="font-medium">
                    {index + 1}. {player?.name}: <span className="text-blue-600 font-bold">{answer.answer}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Colocar Apuestas (2 fichas por jugador)</h3>
          <div className="space-y-4">
            {players.map(player => {
              const playerBet = state.playerBets.find(b => b.playerId === player.id);
              const betsPlaced = playerBet?.betOnAnswerIndices.length || 0;

              return (
                <div key={player.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{player.name}</span>
                    <span className="text-sm text-gray-600">
                      Fichas colocadas: {betsPlaced}/2
                    </span>
                  </div>

                  {playerBet && playerBet.betOnAnswerIndices.length > 0 && (
                    <div className="flex gap-2 mb-2">
                      {playerBet.betOnAnswerIndices.map((betIndex: number, idx: number) => {
                        const betAnswer = sortedAnswers[betIndex];
                        const betPlayer = players.find(p => p.id === betAnswer.playerId);
                        return (
                          <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-lg">
                            <span className="text-sm">
                              Apuesta en {betPlayer?.name} ({betAnswer.answer})
                            </span>
                            <button
                              onClick={() => actions.removeBet(player.id, idx)}
                              className="text-red-500 hover:text-red-700 font-bold"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {betsPlaced < 2 && (
                    <div className="flex flex-wrap gap-2">
                      {sortedAnswers.map((_, answerIndex) => (
                        <button
                          key={answerIndex}
                          onClick={() => actions.placeBet(player.id, answerIndex)}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                        >
                          Apostar en #{answerIndex + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={handleFinishBetting}
            disabled={!actions.canFinishBetting()}
            className="w-full mt-6 px-6 py-3 bg-green-500 text-white text-lg font-bold rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Ver Resultados
          </button>
        </div>
      </div>
    );
  }

  // Results Phase
  if (phase === 'results') {
    const winningInfo = getWinningAnswerInfo();
    if (!winningInfo || !currentQuestion) return null;

    const { winningAnswer, winningIndex, sortedAnswers } = winningInfo;
    const winningPlayer = players.find(p => p.id === winningAnswer.playerId);

    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-3xl font-bold mb-4 text-center">{currentQuestion.question}</h2>
          <div className="text-center mb-6">
            <p className="text-xl text-gray-600">Respuesta correcta:</p>
            <p className="text-4xl font-bold text-green-600">{currentQuestion.answer}</p>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3">Respuesta Ganadora:</h3>
            <div className="p-4 bg-green-100 border-2 border-green-500 rounded-lg">
              <p className="text-lg font-bold">
                {winningPlayer?.name}: {winningAnswer.answer}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3">Todas las Respuestas:</h3>
            <div className="space-y-2">
              {sortedAnswers.map((answer, index) => {
                const player = players.find(p => p.id === answer.playerId);
                const isWinning = index === winningIndex;
                const betsOnThis = state.playerBets.filter(b =>
                  b.betOnAnswerIndices.includes(index)
                );

                return (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${
                      isWinning ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">
                        {player?.name}: <span className="text-blue-600">{answer.answer}</span>
                      </span>
                      {betsOnThis.length > 0 && (
                        <span className="text-sm text-gray-600">
                          {betsOnThis.length} apuesta(s)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3">Puntuaciones Actualizadas:</h3>
            <div className="space-y-2">
              {actions.getSortedPlayers().map((player, index) => (
                <div key={player.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                  <span className="font-medium">
                    {index + 1}. {player.name}
                  </span>
                  <span className="text-2xl font-bold text-blue-600">{player.score}</span>
                </div>
              ))}
            </div>
          </div>

          <ScoreboardGraph />

          <button
            onClick={actions.nextRound}
            className="w-full mt-6 px-6 py-4 bg-blue-500 text-white text-xl font-bold rounded-lg hover:bg-blue-600 transition-colors"
          >
            {currentRound + 1 < totalRounds ? 'Siguiente Ronda' : 'Ver Ganador'}
          </button>
        </div>
      </div>
    );
  }

  // Game Over Phase
  if (phase === 'game-over') {
    const sortedPlayers = actions.getSortedPlayers();
    const winner = sortedPlayers[0];

    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-5xl font-bold mb-8">¡Juego Terminado!</h1>

          <div className="mb-8 p-6 bg-yellow-100 border-4 border-yellow-500 rounded-lg">
            <p className="text-2xl mb-2">🏆 Ganador 🏆</p>
            <p className="text-4xl font-bold text-yellow-700">{winner?.name}</p>
            <p className="text-3xl font-semibold mt-2">{winner?.score} puntos</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Clasificación Final:</h2>
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`p-4 rounded-lg flex justify-between items-center ${
                    index === 0 ? 'bg-yellow-100 border-2 border-yellow-500' : 'bg-gray-50'
                  }`}
                >
                  <span className="text-xl font-medium">
                    {index + 1}. {player.name}
                  </span>
                  <span className="text-2xl font-bold text-blue-600">{player.score}</span>
                </div>
              ))}
            </div>
          </div>

          <ScoreboardGraph />

          <button
            onClick={actions.resetGame}
            className="w-full mt-8 px-6 py-4 bg-green-500 text-white text-xl font-bold rounded-lg hover:bg-green-600 transition-colors"
          >
            Jugar de Nuevo
          </button>
        </div>
      </div>
    );
  }

  return null;
}
