import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from './_app'
import { supabase } from '@/lib/supabase'
import { formatDate, formatTime } from '@/lib/utils'
import Header from '@/components/Header'

export default function AdminPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState('codes')
  const [codes, setCodes] = useState([])
  const [appointments, setAppointments] = useState([])
  const [meetings, setMeetings] = useState([])
  const [showCreateCode, setShowCreateCode] = useState(false)
  const [newCode, setNewCode] = useState({ code: '', profile: 'teacher', display_name: '', class_name: '' })
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    } else if (!loading && user?.profile !== 'admin') {
      router.push('/')
    } else if (user) {
      loadData()
    }
  }, [user, loading])

  const loadData = async () => {
    setLoadingData(true)
    await Promise.all([loadCodes(), loadAppointments(), loadMeetings()])
    setLoadingData(false)
  }

  const loadCodes = async () => {
    const { data } = await supabase
      .from('access_codes')
      .select('*')
      .order('profile')
      .order('display_name')
    if (data) setCodes(data)
  }

  const loadAppointments = async () => {
    const { data } = await supabase
      .from('appointments')
      .select(`
        *,
        teacher:teacher_code_id (display_name, class_name),
        parent:parent_code_id (display_name)
      `)
      .order('date', { ascending: false })
      .limit(50)
    if (data) setAppointments(data)
  }

  const loadMeetings = async () => {
    const { data } = await supabase
      .from('meetings')
      .select(`
        *,
        creator:creator_code_id (display_name)
      `)
      .order('created_at', { ascending: false })
    if (data) setMeetings(data)
  }

  const createCode = async () => {
    if (!newCode.code.trim()) {
      alert('Veuillez entrer un code')
      return
    }

    const { error } = await supabase.from('access_codes').insert({
      code: newCode.code.toUpperCase().trim(),
      profile: newCode.profile,
      display_name: newCode.display_name || null,
      class_name: newCode.class_name || null,
      is_active: true
    })

    if (error) {
      if (error.code === '23505') {
        alert('Ce code existe déjà')
      } else {
        alert('Erreur lors de la création')
      }
    } else {
      setShowCreateCode(false)
      setNewCode({ code: '', profile: 'teacher', display_name: '', class_name: '' })
      loadCodes()
    }
  }

  const toggleCodeStatus = async (code) => {
    await supabase
      .from('access_codes')
      .update({ is_active: !code.is_active })
      .eq('id', code.id)
    loadCodes()
  }

  const deleteCode = async (code) => {
    if (code.profile === 'admin') {
      alert('Impossible de supprimer le code admin')
      return
    }
    if (!confirm(`Supprimer le code "${code.code}" ?`)) return

    await supabase.from('access_codes').delete().eq('id', code.id)
    loadCodes()
  }

  // Stats
  const stats = {
    teachers: codes.filter(c => c.profile === 'teacher' && c.is_active).length,
    partners: codes.filter(c => c.profile === 'partner' && c.is_active).length,
    parents: codes.filter(c => c.profile === 'parent' && c.is_active).length,
    rdvBooked: appointments.filter(a => a.status === 'booked').length,
    rdvAvailable: appointments.filter(a => a.status === 'available').length,
    meetingsPending: meetings.filter(m => m.status === 'pending').length
  }

  // Grouper les codes par profil
  const teacherCodes = codes.filter(c => c.profile === 'teacher')
  const partnerCodes = codes.filter(c => c.profile === 'partner')
  const parentCodes = codes.filter(c => c.profile === 'parent')

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title="Administration" />

      {/* Stats */}
      <div className="container-app">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-primary-600">{stats.teachers}</p>
            <p className="text-xs text-gray-500">Enseignants</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.rdvBooked}</p>
            <p className="text-xs text-gray-500">RDV réservés</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.meetingsPending}</p>
            <p className="text-xs text-gray-500">Sondages actifs</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="container-app py-0">
          <div className="flex space-x-1 overflow-x-auto">
            {[
              { id: 'codes', label: '🔑 Codes' },
              { id: 'rdv', label: '📅 RDV' },
              { id: 'reunions', label: '👥 Réunions' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container-app">
        {/* Tab Codes */}
        {activeTab === 'codes' && (
          <div className="animate-fade-in">
            <button
              onClick={() => setShowCreateCode(true)}
              className="btn-primary w-full mb-4"
            >
              + Nouveau code
            </button>

            {/* Enseignants */}
            <h3 className="font-semibold mb-2 mt-4 flex items-center">
              <span className="mr-2">👨‍🏫</span> Enseignants ({teacherCodes.length})
            </h3>
            {teacherCodes.length === 0 ? (
              <p className="text-gray-500 text-sm mb-4">Aucun enseignant. Créez des codes enseignants.</p>
            ) : (
              <div className="space-y-2 mb-6">
                {teacherCodes.map(code => (
                  <CodeCard
                    key={code.id}
                    code={code}
                    onToggle={() => toggleCodeStatus(code)}
                    onDelete={() => deleteCode(code)}
                  />
                ))}
              </div>
            )}

            {/* Partenaires */}
            <h3 className="font-semibold mb-2 mt-4 flex items-center">
              <span className="mr-2">🏛️</span> Partenaires ({partnerCodes.length})
              <span className="text-xs text-gray-400 ml-2 font-normal">Mairie, Centre Social...</span>
            </h3>
            {partnerCodes.length === 0 ? (
              <p className="text-gray-500 text-sm mb-4">Aucun partenaire. Créez des codes pour la Mairie, le Centre Social, etc.</p>
            ) : (
              <div className="space-y-2 mb-6">
                {partnerCodes.map(code => (
                  <CodeCard
                    key={code.id}
                    code={code}
                    onToggle={() => toggleCodeStatus(code)}
                    onDelete={() => deleteCode(code)}
                  />
                ))}
              </div>
            )}

            {/* Parents */}
            <h3 className="font-semibold mb-2 flex items-center">
              <span className="mr-2">👨‍👩‍👧</span> Parents par classe ({parentCodes.length})
            </h3>
            {parentCodes.length === 0 ? (
              <p className="text-gray-500 text-sm">Aucun code parent. Créez un code par classe.</p>
            ) : (
              <div className="space-y-2">
                {parentCodes.map(code => (
                  <CodeCard
                    key={code.id}
                    code={code}
                    onToggle={() => toggleCodeStatus(code)}
                    onDelete={() => deleteCode(code)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab RDV */}
        {activeTab === 'rdv' && (
          <div className="animate-fade-in">
            <h3 className="font-semibold mb-3">Derniers rendez-vous</h3>
            <div className="space-y-2">
              {appointments.slice(0, 20).map(apt => (
                <div key={apt.id} className="card p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {apt.teacher?.display_name} - {formatDate(apt.date, 'd MMM')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
                      </p>
                    </div>
                    <span className={`badge ${
                      apt.status === 'booked' ? 'badge-info' :
                      apt.status === 'available' ? 'badge-success' : 'badge-gray'
                    }`}>
                      {apt.status === 'booked' ? 'Réservé' :
                       apt.status === 'available' ? 'Dispo' : apt.status}
                    </span>
                  </div>
                  {apt.child_name && (
                    <p className="text-xs text-gray-600 mt-1">
                      Enfant : {apt.child_name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Réunions */}
        {activeTab === 'reunions' && (
          <div className="animate-fade-in">
            <h3 className="font-semibold mb-3">Sondages de réunion</h3>
            {meetings.length === 0 ? (
              <p className="text-gray-500 text-sm">Aucun sondage en cours.</p>
            ) : (
              <div className="space-y-2">
                {meetings.map(meeting => (
                  <div key={meeting.id} className="card p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{meeting.title}</p>
                        <p className="text-xs text-gray-500">
                          Par {meeting.creator?.display_name}
                        </p>
                      </div>
                      <span className={`badge ${
                        meeting.status === 'confirmed' ? 'badge-success' : 'badge-warning'
                      }`}>
                        {meeting.status === 'confirmed' ? 'Confirmé' : 'En attente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal création code */}
      {showCreateCode && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Nouveau code d'accès</h2>
            
            <div className="space-y-4">
              <div>
                <label className="label">Type de compte</label>
                <select
                  value={newCode.profile}
                  onChange={(e) => setNewCode({ ...newCode, profile: e.target.value })}
                  className="input"
                >
                  <option value="teacher">👨‍🏫 Enseignant</option>
                  <option value="partner">🏛️ Partenaire (Mairie, Centre Social...)</option>
                  <option value="parent">👨‍👩‍👧 Parent (par classe)</option>
                </select>
              </div>

              <div>
                <label className="label">Code d'accès</label>
                <input
                  type="text"
                  value={newCode.code}
                  onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                  placeholder={
                    newCode.profile === 'teacher' ? 'Ex: DUPONT' :
                    newCode.profile === 'partner' ? 'Ex: MAIRIE ou CENTRE-SOCIAL' :
                    'Ex: CM2'
                  }
                  className="input uppercase"
                />
              </div>

              <div>
                <label className="label">Nom affiché</label>
                <input
                  type="text"
                  value={newCode.display_name}
                  onChange={(e) => setNewCode({ ...newCode, display_name: e.target.value })}
                  placeholder={
                    newCode.profile === 'teacher' ? 'Ex: M. Dupont' :
                    newCode.profile === 'partner' ? 'Ex: Mme Martin (Mairie)' :
                    'Ex: Parents CM2'
                  }
                  className="input"
                />
              </div>

              {newCode.profile === 'teacher' && (
                <div>
                  <label className="label">Classe</label>
                  <input
                    type="text"
                    value={newCode.class_name}
                    onChange={(e) => setNewCode({ ...newCode, class_name: e.target.value })}
                    placeholder="Ex: CM2"
                    className="input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Lie l'enseignant à une classe pour les RDV parents
                  </p>
                </div>
              )}

              {newCode.profile === 'parent' && (
                <div>
                  <label className="label">Classe</label>
                  <input
                    type="text"
                    value={newCode.class_name}
                    onChange={(e) => setNewCode({ ...newCode, class_name: e.target.value })}
                    placeholder="Ex: CM2"
                    className="input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Les parents verront les enseignants de cette classe
                  </p>
                </div>
              )}

              {newCode.profile === 'partner' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    💡 Les partenaires peuvent participer aux sondages de réunion avec les enseignants.
                  </p>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCreateCode(false)}
                className="btn-secondary flex-1"
              >
                Annuler
              </button>
              <button onClick={createCode} className="btn-primary flex-1">
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CodeCard({ code, onToggle, onDelete }) {
  const profileIcons = {
    teacher: '👨‍🏫',
    partner: '🏛️',
    parent: '👨‍👩‍👧',
    admin: '🔐'
  }

  return (
    <div className={`card p-3 ${!code.is_active ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="mr-2">{profileIcons[code.profile] || '👤'}</span>
          <div>
            <p className="font-mono font-bold text-primary-600">{code.code}</p>
            <p className="text-sm text-gray-600">
              {code.display_name || '(sans nom)'}
              {code.class_name && <span className="text-gray-400"> • {code.class_name}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onToggle}
            className={`text-xs px-2 py-1 rounded ${
              code.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {code.is_active ? 'Actif' : 'Inactif'}
          </button>
          {code.profile !== 'admin' && (
            <button onClick={onDelete} className="text-red-500 text-sm">
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
