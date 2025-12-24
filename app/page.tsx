'use client';

import { useState, useEffect } from 'react';
import { Question, Player, PlayerAnswer, PlayerBet, GamePhase } from './types';

export default function Home() {
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [availableLabels, setAvailableLabels] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);

  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');

  const [gamePhase, setGamePhase] = useState<GamePhase>('setup');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [gameQuestions, setGameQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  const [playerAnswers, setPlayerAnswers] = useState<PlayerAnswer[]>([]);
  const [playerBets, setPlayerBets] = useState<PlayerBet[]>([]);
  const [currentPlayerAnswerInput, setCurrentPlayerAnswerInput] = useState<Record<string, string>>({});

  const [roundsToPlay, setRoundsToPlay] = useState(7);

  useEffect(() => {
    fetch('/questions.json')
      .then(res => res.json())
      .then((data: Question[]) => {
        setAllQuestions(data);
        const labels = Array.from(new Set(data.flatMap(q => q.labels))).sort();
        setAvailableLabels(labels);
        setFilteredQuestions(data);
      });
  }, []);

  useEffect(() => {
    if (selectedLabels.length === 0) {
      setFilteredQuestions(allQuestions);
    } else {
      setFilteredQuestions(
        allQuestions.filter(q =>
          q.labels.some(label => selectedLabels.includes(label))
        )
      );
    }
  }, [selectedLabels, allQuestions]);

  const addPlayer = () => {
    if (newPlayerName.trim()) {
      const newPlayer: Player = {
        id: Date.now().toString(),
        name: newPlayerName.trim(),
        score: 0,
      };
      setPlayers([...players, newPlayer]);
      setNewPlayerName('');
    }
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const toggleLabel = (label: string) => {
    setSelectedLabels(prev =>
      prev.includes(label)
        ? prev.filter(l => l !== label)
        : [...prev, label]
    );
  };

  const startGame = () => {
    if (filteredQuestions.length === 0) {
      alert('¡No hay preguntas disponibles con las etiquetas seleccionadas!');
      return;
    }

    const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, roundsToPlay);
    setGameQuestions(selected);
    setCurrentQuestionIndex(0);
    setCurrentQuestion(selected[0]);
    setGamePhase('answering');
  };

  const submitAnswer = (playerId: string, answer: number) => {
    setPlayerAnswers(prev => {
      const filtered = prev.filter(a => a.playerId !== playerId);
      return [...filtered, { playerId, answer }];
    });
  };

  const finishAnswering = () => {
    if (playerAnswers.length < players.length) {
      alert('¡Todos los jugadores deben enviar una respuesta!');
      return;
    }
    setGamePhase('betting');
  };

  const submitBet = (playerId: string, betOnAnswerIndex: number) => {
    setPlayerBets(prev => {
      const existingBet = prev.find(b => b.playerId === playerId);

      if (existingBet) {
        if (existingBet.betOnAnswerIndices.length < 2) {
          return prev.map(b =>
            b.playerId === playerId
              ? { ...b, betOnAnswerIndices: [...b.betOnAnswerIndices, betOnAnswerIndex] }
              : b
          );
        }
        return prev;
      } else {
        return [...prev, { playerId, betOnAnswerIndices: [betOnAnswerIndex] }];
      }
    });
  };

  const removeBet = (playerId: string, betIndex: number) => {
    setPlayerBets(prev => {
      return prev.map(b =>
        b.playerId === playerId
          ? { ...b, betOnAnswerIndices: b.betOnAnswerIndices.filter((_, i) => i !== betIndex) }
          : b
      );
    });
  };

  const finishBetting = () => {
    if (playerBets.length < players.length || playerBets.some(b => b.betOnAnswerIndices.length < 2)) {
      alert('¡Todos los jugadores deben colocar 2 apuestas!');
      return;
    }
    calculateScores();
    setGamePhase('results');
  };

  const calculateScores = () => {
    if (!currentQuestion) return;

    const sortedAnswers = [...playerAnswers].sort((a, b) => a.answer - b.answer);

    const validAnswers = sortedAnswers.filter(a => a.answer <= currentQuestion.answer);
    const winningAnswer = validAnswers.length > 0
      ? validAnswers[validAnswers.length - 1]
      : sortedAnswers[0];

    const winningIndex = sortedAnswers.findIndex(
      a => a.playerId === winningAnswer.playerId && a.answer === winningAnswer.answer
    );

    setPlayers(prev => prev.map(player => {
      let pointsEarned = 0;

      const playerAnswer = playerAnswers.find(a => a.playerId === player.id);
      if (playerAnswer?.answer === winningAnswer.answer) {
        pointsEarned += 3;
      }

      const playerBet = playerBets.find(b => b.playerId === player.id);
      if (playerBet) {
        const winningBetsCount = playerBet.betOnAnswerIndices.filter(
          index => index === winningIndex
        ).length;
        pointsEarned += winningBetsCount * 2;
      }

      return {
        ...player,
        score: player.score + pointsEarned,
      };
    }));
  };

  const nextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= gameQuestions.length) {
      setGamePhase('game-over');
    } else {
      setCurrentQuestionIndex(nextIndex);
      setCurrentQuestion(gameQuestions[nextIndex]);
      setPlayerAnswers([]);
      setPlayerBets([]);
      setCurrentPlayerAnswerInput({});
      setGamePhase('answering');
    }
  };

  const resetGame = () => {
    setPlayers(prev => prev.map(p => ({ ...p, score: 0 })));
    setCurrentQuestionIndex(0);
    setPlayerAnswers([]);
    setPlayerBets([]);
    setCurrentPlayerAnswerInput({});
    setGameQuestions([]);
    setCurrentQuestion(null);
    setGamePhase('setup');
  };

  const restartRound = () => {
    if (confirm('¿Estás seguro de que quieres reiniciar la ronda actual?')) {
      setPlayerAnswers([]);
      setPlayerBets([]);
      setCurrentPlayerAnswerInput({});
      setGamePhase('answering');
    }
  };

  const getWinningAnswerInfo = () => {
    if (!currentQuestion || playerAnswers.length === 0) return null;

    const sortedAnswers = [...playerAnswers].sort((a, b) => a.answer - b.answer);
    const validAnswers = sortedAnswers.filter(a => a.answer <= currentQuestion.answer);
    const winningAnswer = validAnswers.length > 0
      ? validAnswers[validAnswers.length - 1]
      : sortedAnswers[0];

    const winningIndex = sortedAnswers.findIndex(
      a => a.playerId === winningAnswer.playerId && a.answer === winningAnswer.answer
    );

    return { winningAnswer, winningIndex, sortedAnswers };
  };

  if (gamePhase === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-center mb-8 text-indigo-900 dark:text-indigo-300">
            Wits and Wagers
          </h1>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
              Agregar Jugadores
            </h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
                placeholder="Nombre del jugador"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={addPlayer}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Agregar
              </button>
            </div>

            {players.length > 0 && (
              <div className="space-y-2">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <span className="font-medium text-gray-800 dark:text-gray-100">
                      {player.name}
                    </span>
                    <button
                      onClick={() => removePlayer(player.id)}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {players.length >= 2 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
                Configuración del Juego
              </h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Número de Rondas: {roundsToPlay}
                </label>
                <input
                  type="range"
                  min="3"
                  max="15"
                  value={roundsToPlay}
                  onChange={(e) => setRoundsToPlay(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">
                Filtrar Preguntas por Etiquetas
              </h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {availableLabels.map((label) => (
                  <button
                    key={label}
                    onClick={() => toggleLabel(label)}
                    className={`px-4 py-2 rounded-full font-medium transition-colors ${
                      selectedLabels.includes(label)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                {filteredQuestions.length} preguntas disponibles
                {selectedLabels.length > 0 && ' con las etiquetas seleccionadas'}
              </p>

              <button
                onClick={startGame}
                disabled={players.length < 2 || filteredQuestions.length === 0}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-bold text-lg"
              >
                Comenzar Juego
              </button>
            </div>
          )}

          {players.length < 2 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
              <p className="text-yellow-800 dark:text-yellow-200">
                Agrega al menos 2 jugadores para comenzar el juego
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gamePhase === 'answering') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-gray-800 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-purple-900 dark:text-purple-300">
              Ronda {currentQuestionIndex + 1} de {gameQuestions.length}
            </h2>
            <div className="flex gap-2 items-center">
              <div className="text-lg font-semibold text-purple-800 dark:text-purple-400">
                Fase de Respuestas
              </div>
              <button
                onClick={restartRound}
                className="px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
              >
                Reiniciar Ronda
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-6">
            <h3 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-gray-100">
              {currentQuestion?.question}
            </h3>

            <div className="space-y-4">
              {players.map((player) => {
                const hasAnswered = playerAnswers.some(a => a.playerId === player.id);
                return (
                  <div
                    key={player.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800 dark:text-gray-100 mb-1">
                        {player.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Puntaje: {player.score}
                      </div>
                    </div>
                    {!hasAnswered ? (
                      <>
                        <input
                          type="number"
                          value={currentPlayerAnswerInput[player.id] || ''}
                          onChange={(e) =>
                            setCurrentPlayerAnswerInput(prev => ({
                              ...prev,
                              [player.id]: e.target.value,
                            }))
                          }
                          placeholder="Tu respuesta"
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg w-32 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-600 dark:text-white"
                        />
                        <button
                          onClick={() => {
                            const value = parseFloat(currentPlayerAnswerInput[player.id] || '0');
                            if (!isNaN(value) && value >= 0) {
                              submitAnswer(player.id, value);
                            }
                          }}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                        >
                          Enviar
                        </button>
                      </>
                    ) : (
                      <div className="px-4 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg font-medium">
                        Respuesta Enviada
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={finishAnswering}
            disabled={playerAnswers.length < players.length}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-bold text-lg"
          >
            Continuar a Apuestas ({playerAnswers.length}/{players.length} respondieron)
          </button>
        </div>
      </div>
    );
  }

  if (gamePhase === 'betting') {
    const sortedAnswers = [...playerAnswers].sort((a, b) => a.answer - b.answer);

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 dark:from-gray-900 dark:to-gray-800 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-green-900 dark:text-green-300">
              Ronda {currentQuestionIndex + 1} de {gameQuestions.length}
            </h2>
            <div className="flex gap-2 items-center">
              <div className="text-lg font-semibold text-green-800 dark:text-green-400">
                Fase de Apuestas
              </div>
              <button
                onClick={restartRound}
                className="px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
              >
                Reiniciar Ronda
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-6">
            <h3 className="text-2xl font-bold text-center mb-6 text-gray-800 dark:text-gray-100">
              {currentQuestion?.question}
            </h3>

            <div className="mb-8">
              <h4 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">
                Todas las Respuestas (ordenadas):
              </h4>
              <div className="grid gap-3">
                {sortedAnswers.map((answer, index) => {
                  const player = players.find(p => p.id === answer.playerId);
                  return (
                    <div
                      key={`${answer.playerId}-${index}`}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-gray-200 dark:border-gray-600"
                    >
                      <div>
                        <div className="font-semibold text-gray-800 dark:text-gray-100">
                          {player?.name}
                        </div>
                        <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                          {answer.answer}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                Coloca tus Apuestas (2 fichas por jugador - puedes apostar dos veces a la misma respuesta):
              </h4>
              {players.map((player) => {
                const playerBet = playerBets.find(b => b.playerId === player.id);
                const betsPlaced = playerBet?.betOnAnswerIndices.length || 0;
                const chipsRemaining = 2 - betsPlaced;

                return (
                  <div
                    key={player.id}
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div className="font-semibold text-gray-800 dark:text-gray-100">
                        {player.name}
                      </div>
                      <div className="flex gap-2 items-center">
                        {playerBet && playerBet.betOnAnswerIndices.length > 0 && (
                          <div className="flex gap-1">
                            {playerBet.betOnAnswerIndices.map((betIndex, i) => {
                              const betAnswer = sortedAnswers[betIndex];
                              const betPlayer = players.find(p => p.id === betAnswer?.playerId);
                              return (
                                <button
                                  key={i}
                                  onClick={() => removeBet(player.id, i)}
                                  className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-red-600 transition-colors"
                                  title="Click para remover"
                                >
                                  {betPlayer?.name}: {betAnswer?.answer}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <div className="flex gap-1">
                          {[...Array(2)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                i < betsPlaced
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                              }`}
                            >
                              {i < betsPlaced ? '✓' : (i + 1)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {sortedAnswers.map((answer, index) => {
                        const answerPlayer = players.find(p => p.id === answer.playerId);
                        const chipsOnThisAnswer = playerBet?.betOnAnswerIndices.filter(i => i === index).length || 0;
                        const canBet = chipsRemaining > 0;

                        return (
                          <button
                            key={`${answer.playerId}-${index}`}
                            onClick={() => submitBet(player.id, index)}
                            disabled={!canBet}
                            className={`px-4 py-3 rounded-lg transition-colors font-medium relative ${
                              chipsOnThisAnswer > 0
                                ? 'bg-green-600 text-white ring-2 ring-green-400'
                                : canBet
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            <div>{answerPlayer?.name}</div>
                            <div className="text-xl font-bold">{answer.answer}</div>
                            {chipsOnThisAnswer > 0 && (
                              <div className="absolute top-1 right-1 w-6 h-6 bg-white text-green-600 rounded-full flex items-center justify-center text-xs font-bold">
                                {chipsOnThisAnswer}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={finishBetting}
            disabled={playerBets.length < players.length || playerBets.some(b => b.betOnAnswerIndices.length < 2)}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-bold text-lg"
          >
            Ver Resultados ({playerBets.reduce((sum, b) => sum + b.betOnAnswerIndices.length, 0)}/{players.length * 2} fichas colocadas)
          </button>
        </div>
      </div>
    );
  }

  if (gamePhase === 'results') {
    const winInfo = getWinningAnswerInfo();
    if (!winInfo || !currentQuestion) return null;

    const { winningAnswer, winningIndex, sortedAnswers } = winInfo;
    const winningPlayer = players.find(p => p.id === winningAnswer.playerId);

    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 p-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-6 text-orange-900 dark:text-orange-300">
            Resultados Ronda {currentQuestionIndex + 1}
          </h2>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-6">
            <h3 className="text-2xl font-bold text-center mb-4 text-gray-800 dark:text-gray-100">
              {currentQuestion.question}
            </h3>
            <div className="text-center mb-8">
              <div className="text-lg text-gray-600 dark:text-gray-400 mb-2">
                Respuesta Correcta:
              </div>
              <div className="text-5xl font-bold text-green-600 dark:text-green-400">
                {currentQuestion.answer}
              </div>
            </div>

            <div className="mb-8">
              <h4 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
                Respuesta Ganadora:
              </h4>
              <div className="p-6 bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800 rounded-lg border-4 border-yellow-400 dark:border-yellow-600">
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  {winningPlayer?.name}
                </div>
                <div className="text-4xl font-bold text-yellow-900 dark:text-yellow-200">
                  {winningAnswer.answer}
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h4 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
                Todas las Respuestas:
              </h4>
              <div className="space-y-2">
                {sortedAnswers.map((answer, index) => {
                  const player = players.find(p => p.id === answer.playerId);
                  const isWinning = index === winningIndex;
                  return (
                    <div
                      key={`${answer.playerId}-${index}`}
                      className={`p-4 rounded-lg ${
                        isWinning
                          ? 'bg-yellow-100 dark:bg-yellow-900 border-2 border-yellow-400 dark:border-yellow-600'
                          : 'bg-gray-50 dark:bg-gray-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-gray-800 dark:text-gray-100">
                            {player?.name}
                          </div>
                          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                            {answer.answer}
                          </div>
                        </div>
                        {isWinning && (
                          <div className="text-yellow-600 dark:text-yellow-400 font-bold">
                            GANADORA
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mb-8">
              <h4 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
                Resultados de Apuestas:
              </h4>
              <div className="space-y-3">
                {players.map((player) => {
                  const playerBet = playerBets.find(b => b.playerId === player.id);
                  if (!playerBet) return null;

                  return (
                    <div
                      key={player.id}
                      className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="font-semibold text-gray-800 dark:text-gray-100 mb-2">
                        Apuestas de {player.name}:
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {playerBet.betOnAnswerIndices.map((betIndex, i) => {
                          const betAnswer = sortedAnswers[betIndex];
                          const betPlayer = players.find(p => p.id === betAnswer?.playerId);
                          const isWinningBet = betIndex === winningIndex;

                          return (
                            <div
                              key={i}
                              className={`p-3 rounded-lg ${
                                isWinningBet
                                  ? 'bg-green-100 dark:bg-green-900 border-2 border-green-400 dark:border-green-600'
                                  : 'bg-white dark:bg-gray-600'
                              }`}
                            >
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                Ficha {i + 1}
                              </div>
                              <div className="font-medium text-gray-800 dark:text-gray-100">
                                {betPlayer?.name}: {betAnswer?.answer}
                              </div>
                              {isWinningBet && (
                                <div className="text-green-600 dark:text-green-400 font-bold text-sm mt-1">
                                  +2 puntos!
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
                Puntajes Actuales:
              </h4>
              <div className="space-y-2">
                {[...players]
                  .sort((a, b) => b.score - a.score)
                  .map((player) => (
                    <div
                      key={player.id}
                      className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="font-semibold text-gray-800 dark:text-gray-100">
                        {player.name}
                      </div>
                      <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                        {player.score} pts
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <button
            onClick={nextQuestion}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold text-lg"
          >
            {currentQuestionIndex + 1 >= gameQuestions.length ? 'Ver Resultados Finales' : 'Siguiente Pregunta'}
          </button>
        </div>
      </div>
    );
  }

  if (gamePhase === 'game-over') {
    const winner = [...players].sort((a, b) => b.score - a.score)[0];

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-gray-900 dark:to-gray-800 p-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-8 text-indigo-900 dark:text-indigo-300">
            ¡Fin del Juego!
          </h2>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-6">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">
                {winner && '🏆'}
              </div>
              <h3 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                ¡{winner?.name} Gana!
              </h3>
              <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                {winner?.score} puntos
              </div>
            </div>

            <div>
              <h4 className="text-2xl font-semibold mb-4 text-center text-gray-700 dark:text-gray-300">
                Puntajes Finales
              </h4>
              <div className="space-y-3">
                {[...players]
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => (
                    <div
                      key={player.id}
                      className={`flex justify-between items-center p-5 rounded-lg ${
                        index === 0
                          ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800 border-2 border-yellow-400 dark:border-yellow-600'
                          : 'bg-gray-50 dark:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-3xl font-bold text-gray-600 dark:text-gray-400">
                          #{index + 1}
                        </div>
                        <div className="font-semibold text-xl text-gray-800 dark:text-gray-100">
                          {player.name}
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                        {player.score}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <button
            onClick={resetGame}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-bold text-lg"
          >
            Jugar de Nuevo
          </button>
        </div>
      </div>
    );
  }

  return null;
}
