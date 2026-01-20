import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Monitor, Settings, AlertCircle, Maximize, Clock } from 'lucide-react';
import { db } from './firebase';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

const ClassBoard = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [password, setPassword] = useState('');
  const [sessions, setSessions] = useState({});
  const [editingSession, setEditingSession] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [view, setView] = useState('login');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timeOffset, setTimeOffset] = useState(0);
  const [showTimeSettings, setShowTimeSettings] = useState(false);

  const daysOfWeek = [
    { value: 0, label: 'Dimanche' },
    { value: 1, label: 'Lundi' },
    { value: 2, label: 'Mardi' },
    { value: 3, label: 'Mercredi' },
    { value: 4, label: 'Jeudi' },
    { value: 5, label: 'Vendredi' },
    { value: 6, label: 'Samedi' }
  ];

  const branches = ['Hay Salam', 'Doukkali', 'Saada'];
  const statuses = [
    { value: 'normal', label: 'PRÉVU', color: 'text-white', bg: '' },
    { value: 'cancelled', label: 'ANNULÉE', color: 'text-red-400', bg: 'bg-red-900/30' },
    { value: 'delayed', label: 'RETARDÉE', color: 'text-red-400', bg: 'bg-red-900/30' },
    { value: 'absent', label: 'PROF ABSENT', color: 'text-red-400', bg: 'bg-red-900/30' },
    { value: 'ongoing', label: 'EN COURS', color: 'text-green-400', bg: 'bg-green-900/30' }
  ];

  const formInitialState = {
    dayOfWeek: new Date().getDay(),
    startTime: '19:00',
    endTime: '20:30',
    level: '',
    subject: '',
    professor: '',
    room: '',
    status: 'normal',
    makeupDate: '',
    makeupTime: ''
  };

  const [formData, setFormData] = useState(formInitialState);

  // ========== FONCTIONS FIREBASE ==========
  const loadTimeOffset = async () => {
    try {
      const docRef = doc(db, 'settings', 'timeOffset');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setTimeOffset(docSnap.data().value || 0);
      }
    } catch (error) {
      console.log('Pas de réglage horaire');
    }
  };

  const saveTimeOffset = async (offset) => {
    try {
      await setDoc(doc(db, 'settings', 'timeOffset'), {
        value: offset
      });
      setTimeOffset(offset);
    } catch (error) {
      console.error('Erreur de sauvegarde:', error);
    }
  };

  const loadBranchData = (branch) => {
    const docRef = doc(db, 'branches', branch);
    
    // Écoute en temps réel des changements
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSessions(prev => ({ ...prev, [branch]: data.sessions || [] }));
        setAdminMessage(data.adminMessage || '');
      }
    }, (error) => {
      console.log('Pas de données pour cette filiale:', error);
    });

    return unsubscribe;
  };

  const saveBranchData = async (branch, branchSessions) => {
    try {
      await setDoc(doc(db, 'branches', branch), {
        sessions: branchSessions,
        adminMessage: adminMessage,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erreur de sauvegarde:', error);
      alert('Erreur lors de la sauvegarde. Vérifiez votre connexion.');
    }
  };

  // ========== EFFECTS ==========
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      now.setMinutes(now.getMinutes() + timeOffset);
      setCurrentTime(now);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeOffset]);

  useEffect(() => {
    if (selectedBranch) {
      const unsubscribe = loadBranchData(selectedBranch);
      return () => unsubscribe && unsubscribe();
    }
  }, [selectedBranch]);

  useEffect(() => {
    loadTimeOffset();
  }, []);

  // ========== HANDLERS ==========
  const handleLogin = () => {
    if (password === 'admin123') {
      setIsAuthenticated(true);
      setIsAdmin(true);
      setView('admin');
    } else {
      alert('Mot de passe incorrect');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const addOrUpdateSession = async () => {
    if (!selectedBranch) {
      alert('Veuillez sélectionner une filiale');
      return;
    }

    const newSession = {
      ...formData,
      id: editingSession?.id || Date.now().toString()
    };

    const branchSessions = sessions[selectedBranch] || [];
    const updatedSessions = editingSession
      ? branchSessions.map(s => s.id === editingSession.id ? newSession : s)
      : [...branchSessions, newSession];

    // Sauvegarder immédiatement dans Firebase
    await saveBranchData(selectedBranch, updatedSessions);
    
    setFormData(formInitialState);
    setEditingSession(null);
    setShowAddForm(false);
  };

  const deleteSession = async (id) => {
    if (confirm('Confirmer la suppression ?')) {
      const branchSessions = sessions[selectedBranch] || [];
      const updatedSessions = branchSessions.filter(s => s.id !== id);
      
      // Sauvegarder immédiatement dans Firebase
      await saveBranchData(selectedBranch, updatedSessions);
    }
  };

  const editSession = (session) => {
    setFormData({
      dayOfWeek: session.dayOfWeek,
      startTime: session.startTime,
      endTime: session.endTime,
      level: session.level,
      subject: session.subject,
      professor: session.professor,
      room: session.room,
      status: session.status,
      makeupDate: session.makeupDate || '',
      makeupTime: session.makeupTime || ''
    });
    setEditingSession(session);
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getTodaySessions = () => {
    const currentDayOfWeek = currentTime.getDay();
    const branchSessions = sessions[selectedBranch] || [];
    
    const todaySessions = branchSessions
      .filter(s => s.dayOfWeek === currentDayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    const currentHour = currentTime.getHours();
    const currentMin = currentTime.getMinutes();
    const currentMinutes = currentHour * 60 + currentMin;
    
    return todaySessions.filter(session => {
      const [startHour, startMin] = session.startTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      return startMinutes >= (currentMinutes - 15);
    }).slice(0, 6);
  };

  const isSessionOngoing = (session) => {
    const [startHour, startMin] = session.startTime.split(':').map(Number);
    const [endHour, endMin] = session.endTime.split(':').map(Number);
    const currentHour = currentTime.getHours();
    const currentMin = currentTime.getMinutes();

    const currentMinutes = currentHour * 60 + currentMin;
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  };

  const getSessionStatus = (session) => {
    if (session.status === 'cancelled' || session.status === 'delayed' || session.status === 'absent') {
      return session.status;
    }
    
    if (isSessionOngoing(session)) {
      return 'ongoing';
    }
    
    return 'normal';
  };

  const formatTime = (time) => {
    return time;
  };

  const truncateText = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength - 2) + '..' : text;
  };

  // ========== ÉCRAN DE LOGIN ==========
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-white/20 shadow-2xl">
          <div className="text-center mb-8">
            <div className="bg-blue-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Monitor className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">INTELLECTION</h1>
            <h2 className="text-2xl font-semibold text-blue-200 mb-2">CLASSBOARD</h2>
            <p className="text-blue-300 text-sm">Système d'affichage dynamique</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setView('display')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-lg font-semibold transition-all transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <Monitor className="w-5 h-5" />
              Affichage Étudiant
            </button>

            <button
              onClick={() => setView('adminLogin')}
              className="w-full bg-white/20 hover:bg-white/30 text-white py-4 rounded-lg font-semibold transition-all border border-white/30 flex items-center justify-center gap-2"
            >
              <Settings className="w-5 h-5" />
              Interface Administrateur
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========== ÉCRAN DE LOGIN ADMIN ==========
  if (view === 'adminLogin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-white/20 shadow-2xl">
          <button
            onClick={() => setView('login')}
            className="text-blue-200 hover:text-white mb-6 flex items-center gap-2"
          >
            ← Retour
          </button>
          
          <div className="text-center mb-8">
            <div className="bg-blue-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Authentification</h2>
            <p className="text-blue-200">Accès réservé aux administrateurs</p>
          </div>

          <div className="space-y-4">
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full bg-white/10 border border-white/30 text-white placeholder-blue-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            
            <button
              onClick={handleLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-all"
            >
              Se connecter
            </button>

            <p className="text-xs text-blue-300 text-center mt-4">
              Mot de passe par défaut: admin123
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ========== ÉCRAN D'AFFICHAGE ÉTUDIANT ==========
  if (view === 'display') {
    return (
      <div className="min-h-screen bg-blue-950 text-white overflow-hidden">
        {!isFullscreen && (
          <button
            onClick={() => setView('login')}
            className="absolute top-2 right-2 text-blue-300 hover:text-white text-xs z-50 bg-black/20 px-2 py-1 rounded"
          >
            ← Retour
          </button>
        )}

        <button
          onClick={toggleFullscreen}
          className="absolute top-2 left-2 text-blue-300 hover:text-white text-xs z-50 bg-black/20 px-3 py-2 rounded flex items-center gap-2"
        >
          <Maximize className="w-4 h-4" />
          {isFullscreen ? 'Quitter' : 'Plein écran'}
        </button>

        {!selectedBranch ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-8">Sélectionnez votre filiale</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {branches.map(branch => (
                  <button
                    key={branch}
                    onClick={() => setSelectedBranch(branch)}
                    className="bg-blue-800 hover:bg-blue-700 px-8 py-6 rounded-xl font-semibold text-xl transition-all transform hover:scale-105"
                  >
                    {branch}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-screen flex flex-col">
            <div className="bg-black py-4 px-6 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold text-white tracking-wide">INTELLECTION CLASSBOARD</h1>
                <div className="text-2xl font-bold text-yellow-400 tracking-wide">{selectedBranch}</div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-white tracking-wider font-mono">
                  {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            <div className="bg-blue-700 py-2 px-6">
              <div className="flex justify-between items-center">
                <div className="text-xl font-bold tracking-wide">
                  SÉANCES DU {daysOfWeek.find(d => d.value === currentTime.getDay())?.label.toUpperCase()}
                </div>
                <div className="text-lg">
                  {currentTime.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
                </div>
              </div>
            </div>

            <div className="bg-blue-800 py-2 px-6">
              <div className="grid grid-cols-12 gap-2 text-xs font-bold tracking-wider">
                <div className="col-span-2">HORAIRE</div>
                <div className="col-span-2">FILIÈRE</div>
                <div className="col-span-2">MATIÈRE</div>
                <div className="col-span-2">PROFESSEUR</div>
                <div className="col-span-2">SALLE</div>
                <div className="col-span-2">STATUT</div>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {getTodaySessions().length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-blue-300 text-2xl">
                    AUCUNE SÉANCE PROGRAMMÉE POUR CE {daysOfWeek.find(d => d.value === currentTime.getDay())?.label.toUpperCase()}
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-blue-800/50">
                  {getTodaySessions().map((session, idx) => {
                    const status = getSessionStatus(session);
                    const statusInfo = statuses.find(s => s.value === status);
                    const isOngoing = status === 'ongoing';

                    return (
                      <div
                        key={session.id}
                        className={`py-2.5 px-6 transition-all duration-300 ${statusInfo?.bg} ${
                          isOngoing ? 'border-l-8 border-green-400' : ''
                        } animate-slideDown opacity-0`}
                        style={{ 
                          animation: `slideDown 0.5s ease-out ${idx * 0.15}s forwards`,
                        }}
                      >
                        <div className="grid grid-cols-12 gap-2 items-start">
                          <div className="col-span-2 text-lg font-bold font-mono break-words">
                            {formatTime(session.startTime)}
                          </div>
                          <div className="col-span-2 text-sm font-semibold break-words leading-tight">
                            {session.level}
                          </div>
                          <div className="col-span-2 text-sm break-words leading-tight">
                            {session.subject}
                          </div>
                          <div className="col-span-2 text-sm break-words leading-tight">
                            {session.professor}
                          </div>
                          <div className="col-span-2 text-lg font-bold text-yellow-400 break-words">
                            {session.room}
                          </div>
                          <div className="col-span-2">
                            <div className={`text-sm font-bold ${statusInfo?.color} break-words leading-tight`}>
                              {statusInfo?.label}
                            </div>
                            {session.status === 'absent' && session.makeupDate && (
                              <div className="text-xs text-yellow-300 mt-1 break-words">
                                RATTRAPAGE: {new Date(session.makeupDate).toLocaleDateString('fr-FR')} à {formatTime(session.makeupTime)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {adminMessage && (
              <div className="bg-red-600 text-white py-2 px-4 overflow-hidden relative">
                <div className="flex items-center gap-2 whitespace-nowrap animate-scroll">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="text-base font-semibold tracking-wide">
                      {adminMessage.toUpperCase()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-20">
                    <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="text-base font-semibold tracking-wide">
                      {adminMessage.toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <style jsx>{`
              @keyframes slideDown {
                from {
                  opacity: 0;
                  transform: translateY(-20px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
              
              @keyframes scroll {
                0% {
                  transform: translateX(100%);
                }
                100% {
                  transform: translateX(-100%);
                }
              }
              
              .animate-scroll {
                animation: scroll 20s linear infinite;
              }
            `}</style>
          </div>
        )}
      </div>
    );
  }

  // ========== INTERFACE ADMIN ==========
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-900 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">INTELLECTION CLASSBOARD</h1>
            <p className="text-blue-200 text-sm">Interface de gestion</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowTimeSettings(!showTimeSettings)}
              className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm"
            >
              <Clock className="w-4 h-4" />
              Régler l'heure
            </button>
            <button
              onClick={() => {
                setView('login');
                setIsAuthenticated(false);
                setPassword('');
              }}
              className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-lg transition-all text-sm"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      {showTimeSettings && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-4">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Réglage de l'heure</h3>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Heure système: {new Date().toLocaleTimeString('fr-FR')}
              </div>
              <div className="text-sm text-gray-600">
                Heure affichée: {currentTime.toLocaleTimeString('fr-FR')}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Décalage (minutes):</label>
                <input
                  type="number"
                  value={timeOffset}
                  onChange={(e) => saveTimeOffset(parseInt(e.target.value) || 0)}
                  className="border border-gray-300 rounded px-3 py-1 w-20 text-sm"
                  placeholder="0"
                />
              </div>
              <button
                onClick={() => saveTimeOffset(0)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-6">
        {!selectedBranch ? (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Sélectionnez une filiale</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {branches.map(branch => (
                <button
                  key={branch}
                  onClick={() => setSelectedBranch(branch)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-8 rounded-xl font-semibold text-xl transition-all transform hover:scale-105"
                >
                  {branch}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 bg-white rounded-xl shadow p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedBranch('')}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ← Changer de filiale
                </button>
                <div className="text-xl font-bold text-gray-800">{selectedBranch}</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Message administratif</h3>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value)}
                  placeholder="Message à afficher en bas de l'écran étudiant..."
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => saveBranchData(selectedBranch, sessions[selectedBranch] || [])}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Enregistrer
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Emploi du temps hebdomadaire</h2>
                  <p className="text-gray-600 text-sm mt-1">Les séances se répètent chaque semaine automatiquement</p>
                </div>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all"
                >
                  {showAddForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  {showAddForm ? 'Annuler' : 'Nouvelle séance'}
                </button>
              </div>

              {showAddForm && (
                <div className="bg-blue-50 p-6 rounded-xl mb-6 border border-blue-200">
                  <h3 className="text-lg font-bold mb-4 text-gray-800">
                    {editingSession ? 'Modifier la séance' : 'Ajouter une séance récurrente'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Cette séance se répétera automatiquement chaque semaine
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Jour de la semaine</label>
                      <select
                        value={formData.dayOfWeek}
                        onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {daysOfWeek.map(day => (
                          <option key={day.value} value={day.value}>{day.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {statuses.filter(s => s.value !== 'ongoing').map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Heure début</label>
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Heure fin</label>
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Filière/Niveau</label>
                      <input
                        type="text"
                        value={formData.level}
                        onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                        placeholder="Ex: 1ère année"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Matière</label>
                      <input
                        type="text"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="Ex: Mathématiques"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Professeur</label>
                      <input
                        type="text"
                        value={formData.professor}
                        onChange={(e) => setFormData({ ...formData, professor: e.target.value })}
                        placeholder="Nom du professeur"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Salle</label>
                      <input
                        type="text"
                        value={formData.room}
                        onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                        placeholder="Ex: A101"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {formData.status === 'absent' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Date rattrapage (optionnel)</label>
                          <input
                            type="date"
                            value={formData.makeupDate}
                            onChange={(e) => setFormData({ ...formData, makeupDate: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Heure rattrapage (optionnel)</label>
                          <input
                            type="time"
                            value={formData.makeupTime}
                            onChange={(e) => setFormData({ ...formData, makeupTime: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-6 flex gap-4">
                    <button
                      onClick={addOrUpdateSession}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {editingSession ? 'Mettre à jour' : 'Ajouter'}
                    </button>
                    <button
                      onClick={() => {
                        setFormData(formInitialState);
                        setEditingSession(null);
                        setShowAddForm(false);
                      }}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <div className="mb-4 flex gap-2 flex-wrap">
                  {daysOfWeek.map(day => {
                    const daySessionsCount = (sessions[selectedBranch] || []).filter(s => s.dayOfWeek === day.value).length;
                    return (
                      <div key={day.value} className="bg-blue-100 px-4 py-2 rounded-lg">
                        <span className="font-semibold text-gray-800">{day.label}</span>
                        <span className="ml-2 text-sm text-gray-600">({daySessionsCount} séance{daySessionsCount > 1 ? 's' : ''})</span>
                      </div>
                    );
                  })}
                </div>
                
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Jour</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Horaire</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Filière</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Matière</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Professeur</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Salle</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Statut</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(sessions[selectedBranch] || []).sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)).map(session => (
                      <tr key={session.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          {daysOfWeek.find(d => d.value === session.dayOfWeek)?.label}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {formatTime(session.startTime)} - {formatTime(session.endTime)}
                        </td>
                        <td className="px-4 py-3 text-sm">{session.level}</td>
                        <td className="px-4 py-3 text-sm">{session.subject}</td>
                        <td className="px-4 py-3 text-sm">{session.professor}</td>
                        <td className="px-4 py-3 text-sm font-semibold">{session.room}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`font-semibold ${statuses.find(s => s.value === session.status)?.color}`}>
                            {statuses.find(s => s.value === session.status)?.label}
                          </span>
                          {session.status === 'absent' && session.makeupDate && (
                            <div className="text-xs text-yellow-600 mt-1">
                              Rattrapage: {new Date(session.makeupDate).toLocaleDateString('fr-FR')}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => editSession(session)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteSession(session.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ClassBoard;