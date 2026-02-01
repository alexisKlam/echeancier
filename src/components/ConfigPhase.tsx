import React, { useState } from 'react';
import { useTournamentStore } from '../store';
import { getContrastColor } from '../types';

export const ConfigPhase: React.FC = () => {
  const {
    settings,
    series,
    updateSettings,
    addSeries,
    removeSeries,
    updateSeries,
    addRound,
    removeRound,
    updateRound,
    setPhase,
    resetAll,
  } = useTournamentStore();

  const [newSeriesName, setNewSeriesName] = useState('');
  const [newSeriesShortName, setNewSeriesShortName] = useState('');

  const handleAddSeries = () => {
    if (newSeriesName.trim() && newSeriesShortName.trim()) {
      addSeries(newSeriesName.trim(), newSeriesShortName.trim());
      setNewSeriesName('');
      setNewSeriesShortName('');
    }
  };

  const handleAddRound = (seriesId: string) => {
    const serie = series.find((s) => s.id === seriesId);
    if (!serie) return;

    const roundNum = serie.rounds.length + 1;
    let label = `Tour ${roundNum}`;
    // Default match count
    addRound(seriesId, 4, label);
  };

  const totalRounds = series.reduce((acc, s) => acc + s.rounds.length, 0);
  const totalMatches = series.reduce(
    (acc, s) => acc + s.rounds.reduce((a, r) => a + r.matchCount, 0),
    0
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          ⚙️ Configuration du Tournoi
        </h2>

        {/* Tournament Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de terrains
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={settings.courtCount}
              onChange={(e) =>
                updateSettings({ courtCount: parseInt(e.target.value) || 1 })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Durée créneau (minutes)
            </label>
            <input
              type="number"
              min="15"
              max="60"
              step="5"
              value={settings.timeSlotDuration}
              onChange={(e) =>
                updateSettings({
                  timeSlotDuration: parseInt(e.target.value) || 35,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Heure de début
            </label>
            <input
              type="time"
              value={settings.startTime}
              onChange={(e) => updateSettings({ startTime: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Heure de fin
            </label>
            <input
              type="time"
              value={settings.endTime || '18:00'}
              onChange={(e) => updateSettings({ endTime: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Add Series Form */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">
            Ajouter une série
          </h3>
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Nom complet (ex: Double Homme 1)"
              value={newSeriesName}
              onChange={(e) => setNewSeriesName(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Abréviation (ex: DH1)"
              value={newSeriesShortName}
              onChange={(e) => setNewSeriesShortName(e.target.value)}
              className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddSeries}
              disabled={!newSeriesName.trim() || !newSeriesShortName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              + Ajouter
            </button>
          </div>
        </div>

        {/* Quick Add Templates */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-600 mb-2">
            Ajout rapide :
          </h4>
          <div className="flex gap-2 flex-wrap">
            {[
              { name: 'Simple Homme', short: 'SH' },
              { name: 'Simple Dame', short: 'SD' },
              { name: 'Double Homme', short: 'DH' },
              { name: 'Double Dame', short: 'DD' },
              { name: 'Double Mixte', short: 'DX' },
            ].map((template) => (
              <button
                key={template.short}
                onClick={() => {
                  const existing = series.filter((s) =>
                    s.shortName.startsWith(template.short)
                  ).length;
                  const num = existing + 1;
                  addSeries(`${template.name} ${num}`, `${template.short}${num}`);
                }}
                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
              >
                + {template.short}
              </button>
            ))}
          </div>
        </div>

        {/* Series List */}
        <div className="space-y-4">
          {series.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
              Aucune série configurée. Ajoutez des séries ci-dessus.
            </div>
          ) : (
            series.map((s) => (
              <div
                key={s.id}
                className="border rounded-lg overflow-hidden"
                style={{ borderColor: s.color }}
              >
                {/* Series Header */}
                <div
                  className="px-4 py-3 flex items-center justify-between"
                  style={{
                    backgroundColor: s.color,
                    color: getContrastColor(s.color),
                  }}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={s.shortName}
                      onChange={(e) =>
                        updateSeries(s.id, { shortName: e.target.value })
                      }
                      className="w-16 px-2 py-1 rounded text-sm font-bold text-center bg-white/20 border-none focus:outline-none focus:ring-2 focus:ring-white/50"
                      style={{ color: getContrastColor(s.color) }}
                    />
                    <input
                      type="text"
                      value={s.name}
                      onChange={(e) =>
                        updateSeries(s.id, { name: e.target.value })
                      }
                      className="px-2 py-1 rounded text-sm bg-white/20 border-none focus:outline-none focus:ring-2 focus:ring-white/50 min-w-[150px]"
                      style={{ color: getContrastColor(s.color) }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm opacity-80">
                      {s.rounds.length} tour(s)
                    </span>
                    <button
                      onClick={() => removeSeries(s.id)}
                      className="p-1 hover:bg-white/20 rounded transition-colors"
                      title="Supprimer la série"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Rounds */}
                <div className="p-4 bg-white">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {s.rounds.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg"
                      >
                        <input
                          type="text"
                          value={r.label}
                          onChange={(e) =>
                            updateRound(s.id, r.id, { label: e.target.value })
                          }
                          className="w-20 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={r.matchCount}
                            onChange={(e) =>
                              updateRound(s.id, r.id, {
                                matchCount: parseInt(e.target.value) || 1,
                              })
                            }
                            className="w-14 px-2 py-1 text-sm border rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-xs text-gray-500">matchs</span>
                        </div>
                        <button
                          onClick={() => removeRound(s.id, r.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Supprimer le tour"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleAddRound(s.id)}
                    className="px-3 py-1 text-sm border border-dashed border-gray-400 text-gray-600 rounded hover:bg-gray-50 transition-colors"
                  >
                    + Ajouter un tour
                  </button>

                  {/* Quick round templates */}
                  <div className="mt-2 flex gap-1">
                    {[
                      { label: 'Poule', matches: 6 },
                      { label: 'Demi', matches: 2 },
                      { label: 'Finale', matches: 1 },
                    ].map((template) => (
                      <button
                        key={template.label}
                        onClick={() =>
                          addRound(s.id, template.matches, template.label)
                        }
                        className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                      >
                        + {template.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        {series.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">📊 Résumé</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {series.length}
                </div>
                <div className="text-sm text-gray-600">Séries</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {totalRounds}
                </div>
                <div className="text-sm text-gray-600">Tours</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {totalMatches}
                </div>
                <div className="text-sm text-gray-600">Matchs</div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-between items-center">
          <button
            onClick={() => {
              if (
                window.confirm(
                  'Êtes-vous sûr de vouloir tout réinitialiser ?'
                )
              ) {
                resetAll();
              }
            }}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            🗑️ Tout réinitialiser
          </button>
          <button
            onClick={() => setPhase('schedule')}
            disabled={series.length === 0 || totalRounds === 0}
            className="px-6 py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Continuer vers l'échéancier →
          </button>
        </div>
      </div>
    </div>
  );
};
