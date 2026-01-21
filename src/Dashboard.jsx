import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, AlertCircle, Calendar, Clock, Building2, FileDown, ArrowLeft } from 'lucide-react';

const Dashboard = ({ sessions, onBack }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // day, week, month
  const [analytics, setAnalytics] = useState({});

  // Configuration des filiales
  const branchConfig = {
    'Hay Salam': { rooms: 8, color: 'blue' },
    'Doukkali': { rooms: 4, color: 'green' },
    'Saada': { rooms: 4, color: 'purple' }
  };

  // Horaires d'ouverture
  const openingHours = {
    0: { start: 9, end: 22, hours: 13 },  // Dimanche
    1: { start: 16, end: 22, hours: 6 },  // Lundi
    2: { start: 16, end: 22, hours: 6 },  // Mardi
    3: { start: 16, end: 22, hours: 6 },  // Mercredi
    4: { start: 16, end: 22, hours: 6 },  // Jeudi
    5: { start: 16, end: 22, hours: 6 },  // Vendredi
    6: { start: 14, end: 22, hours: 8 }   // Samedi
  };

  const daysOfWeek = [
    { value: 0, label: 'Dimanche' },
    { value: 1, label: 'Lundi' },
    { value: 2, label: 'Mardi' },
    { value: 3, label: 'Mercredi' },
    { value: 4, label: 'Jeudi' },
    { value: 5, label: 'Vendredi' },
    { value: 6, label: 'Samedi' }
  ];

  // Calcul des analytics
  useEffect(() => {
    const calculateAnalytics = () => {
      const newAnalytics = {};

      Object.keys(branchConfig).forEach(branch => {
        const branchSessions = sessions[branch] || [];
        const rooms = branchConfig[branch].rooms;

        // Calculer les heures programmées par jour
        const hoursByDay = {};
        daysOfWeek.forEach(day => {
          const daySessions = branchSessions.filter(s => s.dayOfWeek === day.value);
          
          // Calculer le total d'heures programmées
          const totalHours = daySessions.reduce((acc, session) => {
            const [startH, startM] = session.startTime.split(':').map(Number);
            const [endH, endM] = session.endTime.split(':').map(Number);
            const duration = ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
            return acc + duration;
          }, 0);

          // Capacité maximale pour ce jour
          const dayCapacity = rooms * openingHours[day.value].hours;
          const occupancyRate = dayCapacity > 0 ? (totalHours / dayCapacity) * 100 : 0;

          hoursByDay[day.value] = {
            programmed: totalHours,
            capacity: dayCapacity,
            available: dayCapacity - totalHours,
            rate: occupancyRate,
            sessionsCount: daySessions.length
          };
        });

        // Calculer les statistiques hebdomadaires
        const weeklyCapacity = Object.values(hoursByDay).reduce((acc, day) => acc + day.capacity, 0);
        const weeklyProgrammed = Object.values(hoursByDay).reduce((acc, day) => acc + day.programmed, 0);
        const weeklyAvailable = weeklyCapacity - weeklyProgrammed;
        const weeklyRate = weeklyCapacity > 0 ? (weeklyProgrammed / weeklyCapacity) * 100 : 0;

        // Détecter les créneaux sous-utilisés
        const underutilizedSlots = [];
        Object.entries(hoursByDay).forEach(([dayIndex, dayData]) => {
          if (dayData.rate < 60 && dayData.available >= 1.5) {
            underutilizedSlots.push({
              day: daysOfWeek[dayIndex].label,
              dayIndex: parseInt(dayIndex),
              available: dayData.available.toFixed(1),
              rate: dayData.rate.toFixed(0)
            });
          }
        });

        newAnalytics[branch] = {
          rooms,
          hoursByDay,
          weekly: {
            capacity: weeklyCapacity,
            programmed: weeklyProgrammed,
            available: weeklyAvailable,
            rate: weeklyRate
          },
          underutilizedSlots,
          totalSessions: branchSessions.length
        };
      });

      setAnalytics(newAnalytics);
    };

    calculateAnalytics();
  }, [sessions]);

  // Déterminer la couleur selon le taux d'occupation
  const getOccupancyColor = (rate) => {
    if (rate >= 70) return 'text-green-600 bg-green-100';
    if (rate >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getOccupancyEmoji = (rate) => {
    if (rate >= 70) return '🟢';
    if (rate >= 50) return '🟡';
    return '🔴';
  };

  // Export vers Excel (simulation)
  const exportToExcel = () => {
    let csvContent = "Filiale,Salles,Capacité Hebdo,Heures Programmées,Heures Disponibles,Taux d'Occupation\n";
    
    Object.keys(branchConfig).forEach(branch => {
      const data = analytics[branch];
      if (data) {
        csvContent += `${branch},${data.rooms},${data.weekly.capacity}h,${data.weekly.programmed.toFixed(1)}h,${data.weekly.available.toFixed(1)}h,${data.weekly.rate.toFixed(1)}%\n`;
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intellection-dashboard-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Aujourd'hui
  const today = new Date().getDay();
  const todayData = {};
  Object.keys(analytics).forEach(branch => {
    if (analytics[branch]?.hoursByDay?.[today]) {
      todayData[branch] = analytics[branch].hoursByDay[today];
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="bg-blue-800 hover:bg-blue-600 p-2 rounded-lg transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <BarChart3 className="w-8 h-8" />
                  INTELLECTION DASHBOARD
                </h1>
                <p className="text-blue-200 text-sm mt-1">Analytics & Optimisation</p>
              </div>
            </div>
            <button
              onClick={exportToExcel}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
            >
              <FileDown className="w-4 h-4" />
              Export Excel
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Vue d'ensemble */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-800">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Vue d'ensemble hebdomadaire
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.keys(branchConfig).map(branch => {
              const data = analytics[branch];
              if (!data) return null;

              return (
                <div key={branch} className="border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800">{branch}</h3>
                    <Building2 className={`w-6 h-6 text-${branchConfig[branch].color}-600`} />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Salles</span>
                      <span className="font-bold text-gray-800">{data.rooms}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Capacité hebdo</span>
                      <span className="font-bold text-gray-800">{data.weekly.capacity}h</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Programmé</span>
                      <span className="font-bold text-blue-600">{data.weekly.programmed.toFixed(1)}h</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Disponible</span>
                      <span className="font-bold text-orange-600">{data.weekly.available.toFixed(1)}h</span>
                    </div>
                    
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-700 font-medium">Taux d'occupation</span>
                        <span className="text-2xl">{getOccupancyEmoji(data.weekly.rate)}</span>
                      </div>
                      <div className={`text-3xl font-bold text-center py-3 rounded-lg ${getOccupancyColor(data.weekly.rate)}`}>
                        {data.weekly.rate.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Aujourd'hui */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-800">
            <Calendar className="w-6 h-6 text-blue-600" />
            Aujourd'hui - {daysOfWeek[today].label}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.keys(todayData).map(branch => {
              const data = todayData[branch];
              
              return (
                <div key={branch} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-bold text-lg mb-3 text-gray-800">{branch}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm">Capacité</span>
                      <span className="font-semibold">{data.capacity}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm">Programmé</span>
                      <span className="font-semibold text-blue-600">{data.programmed.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm">Disponible</span>
                      <span className="font-semibold text-orange-600">{data.available.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm">Séances</span>
                      <span className="font-semibold">{data.sessionsCount}</span>
                    </div>
                    <div className={`text-center py-2 rounded mt-2 ${getOccupancyColor(data.rate)}`}>
                      <span className="font-bold">{data.rate.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Opportunités détectées */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-800">
            <AlertCircle className="w-6 h-6 text-orange-600" />
            Opportunités d'optimisation
          </h2>
          
          {Object.keys(analytics).map(branch => {
            const data = analytics[branch];
            if (!data || data.underutilizedSlots.length === 0) return null;

            return (
              <div key={branch} className="mb-6 last:mb-0">
                <h3 className="font-bold text-lg mb-3 text-gray-800 flex items-center gap-2">
                  {branch}
                  <span className="text-sm font-normal text-gray-500">
                    ({data.underutilizedSlots.length} créneaux sous-utilisés)
                  </span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.underutilizedSlots.map((slot, idx) => (
                    <div key={idx} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <span className="font-semibold text-gray-800">{slot.day}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div>Taux actuel: <span className="font-semibold text-orange-600">{slot.rate}%</span></div>
                        <div>Disponible: <span className="font-semibold text-blue-600">{slot.available}h</span></div>
                        <div className="mt-2 text-xs text-gray-500">
                          ≈ {Math.floor(parseFloat(slot.available) / 1.5)} cours supplémentaires possibles
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {Object.values(analytics).every(data => !data || data.underutilizedSlots.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg">🎉 Excellent ! Toutes les filiales ont un bon taux d'occupation (≥60%)</p>
            </div>
          )}
        </div>

        {/* Détails par jour */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-800">
            <Calendar className="w-6 h-6 text-blue-600" />
            Occupation par jour de la semaine
          </h2>
          
          {Object.keys(branchConfig).map(branch => {
            const data = analytics[branch];
            if (!data) return null;

            return (
              <div key={branch} className="mb-8 last:mb-0">
                <h3 className="font-bold text-xl mb-4 text-gray-800">{branch}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Jour</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Horaires</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Capacité</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Programmé</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Disponible</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Séances</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Taux</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {daysOfWeek.map(day => {
                        const dayData = data.hoursByDay[day.value];
                        const hours = openingHours[day.value];
                        
                        return (
                          <tr key={day.value} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-800">{day.label}</td>
                            <td className="px-4 py-3 text-center text-sm text-gray-600">
                              {hours.start}h-{hours.end}h
                            </td>
                            <td className="px-4 py-3 text-center font-semibold">{dayData.capacity}h</td>
                            <td className="px-4 py-3 text-center font-semibold text-blue-600">
                              {dayData.programmed.toFixed(1)}h
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-orange-600">
                              {dayData.available.toFixed(1)}h
                            </td>
                            <td className="px-4 py-3 text-center">{dayData.sessionsCount}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-3 py-1 rounded-full font-bold ${getOccupancyColor(dayData.rate)}`}>
                                {dayData.rate.toFixed(0)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;