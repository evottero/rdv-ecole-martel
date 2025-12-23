import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from './_app'
import { supabase } from '@/lib/supabase'
import { formatDate, formatTime, isTodayOrFuture } from '@/lib/utils'
import Header from '@/components/Header'

export default function ParentPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [teachers, setTeachers] = useState([])
  const [selectedTeacher, setSelectedTeacher] = useState(null)
  const [selectedTeacherName, setSelectedTeacherName] = useState('')
  const [slots, setSlots] = useState([])
  const [myAppointments, setMyAppointments] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [childName, setChildName] = useState('')
  const [isBooking, setIsBooking] = useState(false)
  const [activeTab, setActiveTab] = useState('book') // 'book' ou 'my'
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    } else if (!loading && user?.profile !== 'parent') {
      router.push('/')
    } else if (user) {
      loadData()
    }
  }, [user, loading])

  const loadData = async () => {
    setLoadingData(true)
    await Promise.all([
      loadTeachers(),
      loadMyAppointments()
    ])
    setLoadingData(false)
  }

  const loadTeachers = async () => {
    // Charger les enseignants de la même classe que le parent
    const { data, error } = await supabase
      .from('access_codes')
      .select('*')
      .eq('profile', 'teacher')
      .eq('class_name', user.class_name)
      .eq('is_active', true)
      .order('display_name')

    if (data) setTeachers(data)
  }

  const loadMyAppointments = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        teacher:teacher_code_id (display_name, class_name)
      `)
      .eq('parent_code_id', user.id)
      .in('status', ['booked'])
      .order('date', { ascending: true })

    if (data) {
      // Filtrer pour ne garder que les futurs
      setMyAppointments(data.filter(a => isTodayOrFuture(a.date)))
    }
  }

  const loadSlots = async (teacherId, teacherName) => {
    setSelectedTeacher(teacherId)
    setSelectedTeacherName(teacherName)
    setSelectedSlot(null)

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('teacher_code_id', teacherId)
      .eq('status', 'available')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    if (data) setSlots(data)
  }

  const handleBook = async () => {
    if (!selectedSlot) return
    setIsBooking(true)

    const { data, error } = await supabase
      .from('appointments')
      .update({
        status: 'booked',
        parent_code_id: user.id,
        child_name: childName.trim() || null,
        booked_at: new Date().toISOString()
      })
      .eq('id', selectedSlot.id)
      .eq('status', 'available') // Double vérification
      .select()

    if (error || !data?.length) {
      alert('Ce créneau n\'est plus disponible. Veuillez en choisir un autre.')
      loadSlots(selectedTeacher, selectedTeacherName)
    } else {
      alert('✅ Rendez-vous réservé avec succès !')
      setSelectedSlot(null)
      setChildName('')
      loadSlots(selectedTeacher, selectedTeacherName)
      loadMyAppointments()
      // On reste sur la page de réservation pour permettre d'autres réservations
    }

    setIsBooking(false)
  }

  const handleCancel = async (appointmentId) => {
    if (!confirm('Voulez-vous vraiment annuler ce rendez-vous ?')) return

    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'available',
        parent_code_id: null,
        child_name: null,
        booked_at: null
      })
      .eq('id', appointmentId)

    if (!error) {
      loadMyAppointments()
      if (selectedTeacher) loadSlots(selectedTeacher, selectedTeacherName)
    }
  }

  // Grouper les créneaux par date
  const slotsByDate = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = []
    acc[slot.date].push(slot)
    return acc
  }, {})

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="École Martel" />

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="container-app py-0">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('book')}
              className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors ${
                activeTab === 'book'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              📅 Réserver
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors ${
                activeTab === 'my'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              📋 Mes RDV ({myAppointments.length})
            </button>
          </div>
        </div>
      </div>

      <div className="container-app">
        {activeTab === 'book' ? (
          <>
            {/* Sélection enseignant */}
            {!selectedTeacher ? (
              <div className="animate-fade-in">
                <h2 className="text-lg font-semibold mb-4">Choisir un enseignant</h2>
                
                {teachers.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📚</div>
                    <p className="empty-state-title">Aucun enseignant disponible</p>
                    <p className="empty-state-text">
                      Il n'y a pas d'enseignant pour la classe {user.class_name}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {teachers.map(teacher => (
                      <button
                        key={teacher.id}
                        onClick={() => loadSlots(teacher.id, teacher.display_name)}
                        className="card-hover w-full p-4 text-left flex items-center"
                      >
                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mr-4">
                          <span className="text-2xl">👨‍🏫</span>
                        </div>
                        <div>
                          <p className="font-medium">{teacher.display_name}</p>
                          <p className="text-sm text-gray-500">{teacher.class_name}</p>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-fade-in">
                {/* Retour */}
                <button
                  onClick={() => {
                    setSelectedTeacher(null)
                    setSelectedTeacherName('')
                    setSlots([])
                    setSelectedSlot(null)
                  }}
                  className="flex items-center text-primary-600 mb-4"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Changer d'enseignant
                </button>

                <h2 className="text-lg font-semibold mb-1">
                  Créneaux de {selectedTeacherName}
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Sélectionnez un créneau pour le réserver
                </p>

                {/* Rappel des RDV déjà pris */}
                {myAppointments.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-800">
                      📌 Vous avez déjà {myAppointments.length} RDV réservé{myAppointments.length > 1 ? 's' : ''}
                    </p>
                  </div>
                )}

                {slots.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📅</div>
                    <p className="empty-state-title">Aucun créneau disponible</p>
                    <p className="empty-state-text">
                      Cet enseignant n'a pas de créneau ouvert actuellement
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 pb-32">
                    {Object.entries(slotsByDate).map(([date, dateSlots]) => (
                      <div key={date}>
                        <h3 className="text-sm font-medium text-gray-500 mb-2 capitalize">
                          {formatDate(date)}
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          {dateSlots.map(slot => (
                            <button
                              key={slot.id}
                              onClick={() => setSelectedSlot(slot)}
                              className={selectedSlot?.id === slot.id ? 'slot-selected' : 'slot-available'}
                            >
                              <span className="font-medium">{formatTime(slot.start_time)}</span>
                              <span className="text-xs text-gray-500 block">
                                → {formatTime(slot.end_time)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulaire de réservation */}
                {selectedSlot && (
                  <div className="fixed inset-x-0 bottom-0 bg-white border-t shadow-lg p-4 safe-bottom animate-fade-in">
                    <div className="max-w-lg mx-auto">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-primary-600">
                            {formatDate(selectedSlot.date, 'EEEE d MMMM')}
                          </p>
                          <p className="text-gray-600">
                            {formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedSlot(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </div>
                      
                      <input
                        type="text"
                        value={childName}
                        onChange={(e) => setChildName(e.target.value)}
                        placeholder="Prénom de l'enfant (optionnel)"
                        className="input mb-3"
                      />
                      
                      <button
                        onClick={handleBook}
                        disabled={isBooking}
                        className="btn-success w-full py-3"
                      >
                        {isBooking ? 'Réservation en cours...' : '✓ Confirmer la réservation'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* Mes rendez-vous */
          <div className="animate-fade-in">
            <h2 className="text-lg font-semibold mb-4">Mes rendez-vous à venir</h2>

            {myAppointments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <p className="empty-state-title">Aucun rendez-vous</p>
                <p className="empty-state-text">
                  Vous n'avez pas de rendez-vous prévu
                </p>
                <button
                  onClick={() => setActiveTab('book')}
                  className="btn-primary mt-4"
                >
                  Réserver un créneau
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myAppointments.map(apt => (
                  <div key={apt.id} className="card p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{apt.teacher?.display_name}</p>
                        <p className="text-primary-600 font-medium mt-1">
                          {formatDate(apt.date, 'EEEE d MMMM')}
                        </p>
                        <p className="text-gray-600">
                          {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
                        </p>
                        {apt.child_name && (
                          <p className="text-sm text-gray-500 mt-1">
                            👦 {apt.child_name}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleCancel(apt.id)}
                        className="text-red-600 text-sm hover:text-red-800"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ))}

                {/* Bouton pour réserver encore */}
                <div className="pt-4">
                  <button
                    onClick={() => setActiveTab('book')}
                    className="btn-outline w-full"
                  >
                    + Réserver un autre créneau
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
