import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from './_app'
import { supabase } from '@/lib/supabase'
import { formatDate, formatTime, toInputDate } from '@/lib/utils'
import Header from '@/components/Header'

export default function TeacherPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState('rdv') // 'rdv' ou 'reunions'
  const [appointments, setAppointments] = useState([])
  const [meetings, setMeetings] = useState([])
  const [showCreateSlot, setShowCreateSlot] = useState(false)
  const [showCreateMeeting, setShowCreateMeeting] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  // État création créneau - création manuelle libre
  const [slotDate, setSlotDate] = useState('')
  const [slotStartHour, setSlotStartHour] = useState('08')
  const [slotStartMin, setSlotStartMin] = useState('00')
  const [slotEndHour, setSlotEndHour] = useState('08')
  const [slotEndMin, setSlotEndMin] = useState('15')

  // État création réunion
  const [meetingTitle, setMeetingTitle] = useState('')
  const [meetingSlots, setMeetingSlots] = useState([{ date: '', start: '14:00', end: '15:00' }])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    } else if (!loading && user?.profile !== 'teacher') {
      router.push('/')
    } else if (user) {
      loadData()
    }
  }, [user, loading])

  const loadData = async () => {
    setLoadingData(true)
    await Promise.all([loadAppointments(), loadMeetings()])
    setLoadingData(false)
  }

  const loadAppointments = async () => {
    const { data } = await supabase
      .from('appointments')
      .select(`
        *,
        parent:parent_code_id (display_name, class_name)
      `)
      .eq('teacher_code_id', user.id)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    if (data) setAppointments(data)
  }

  const loadMeetings = async () => {
    const { data } = await supabase
      .from('meetings')
      .select(`
        *,
        creator:creator_code_id (display_name),
        slots:meeting_slots (
          id, date, start_time, end_time,
          responses:meeting_responses (
            id, status,
            teacher:teacher_code_id (display_name)
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (data) setMeetings(data)
  }

  // Création d'un seul créneau manuellement
  const createSingleSlot = async () => {
    if (!slotDate) {
      alert('Veuillez sélectionner une date')
      return
    }

    const startTime = `${slotStartHour}:${slotStartMin}`
    const endTime = `${slotEndHour}:${slotEndMin}`

    // Vérifier que l'heure de fin est après l'heure de début
    const startMinutes = parseInt(slotStartHour) * 60 + parseInt(slotStartMin)
    const endMinutes = parseInt(slotEndHour) * 60 + parseInt(slotEndMin)

    if (endMinutes <= startMinutes) {
      alert('L\'heure de fin doit être après l\'heure de début')
      return
    }

    setIsCreating(true)

    const { error } = await supabase.from('appointments').insert({
      teacher_code_id: user.id,
      date: slotDate,
      start_time: startTime,
      end_time: endTime,
      status: 'available'
    })

    if (!error) {
      alert('Créneau créé !')
      // Préparer le prochain créneau (enchaîner)
      const newStartHour = slotEndHour
      const newStartMin = slotEndMin
      setSlotStartHour(newStartHour)
      setSlotStartMin(newStartMin)
      // Ajouter 15 min par défaut pour la fin
      let newEndMinutes = parseInt(newStartHour) * 60 + parseInt(newStartMin) + 15
      const newEndH = Math.floor(newEndMinutes / 60)
      const newEndM = newEndMinutes % 60
      setSlotEndHour(String(newEndH).padStart(2, '0'))
      setSlotEndMin(String(newEndM).padStart(2, '0'))
      
      loadAppointments()
    } else {
      alert('Erreur lors de la création')
    }

    setIsCreating(false)
  }

  const deleteSlot = async (slotId) => {
    if (!confirm('Supprimer ce créneau ?')) return
    
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', slotId)
      .eq('status', 'available')

    if (!error) loadAppointments()
  }

  const createMeeting = async () => {
    if (!meetingTitle.trim()) {
      alert('Veuillez entrer un titre')
      return
    }

    const validSlots = meetingSlots.filter(s => s.date)
    if (validSlots.length === 0) {
      alert('Ajoutez au moins un créneau')
      return
    }

    // Créer la réunion
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        title: meetingTitle,
        creator_code_id: user.id,
        status: 'pending'
      })
      .select()
      .single()

    if (meetingError) {
      alert('Erreur lors de la création')
      return
    }

    // Créer les créneaux
    const slotsToInsert = validSlots.map(s => ({
      meeting_id: meeting.id,
      date: s.date,
      start_time: s.start,
      end_time: s.end
    }))

    await supabase.from('meeting_slots').insert(slotsToInsert)

    alert('Sondage créé ! Partagez le lien avec vos collègues.')
    setShowCreateMeeting(false)
    setMeetingTitle('')
    setMeetingSlots([{ date: '', start: '14:00', end: '15:00' }])
    loadMeetings()
  }

  const respondToSlot = async (slotId, status) => {
    // Vérifier si une réponse existe déjà
    const { data: existing } = await supabase
      .from('meeting_responses')
      .select('id')
      .eq('slot_id', slotId)
      .eq('teacher_code_id', user.id)
      .single()

    if (existing) {
      await supabase
        .from('meeting_responses')
        .update({ status })
        .eq('id', existing.id)
    } else {
      await supabase.from('meeting_responses').insert({
        slot_id: slotId,
        teacher_code_id: user.id,
        status
      })
    }

    loadMeetings()
  }

  const confirmMeetingSlot = async (meetingId, slotId) => {
    await supabase
      .from('meetings')
      .update({ status: 'confirmed', confirmed_slot_id: slotId })
      .eq('id', meetingId)

    loadMeetings()
  }

  // Grouper les RDV par date
  const appointmentsByDate = appointments.reduce((acc, apt) => {
    if (!acc[apt.date]) acc[apt.date] = []
    acc[apt.date].push(apt)
    return acc
  }, {})

  // Générer les options d'heures et minutes
  const hours = Array.from({ length: 15 }, (_, i) => String(i + 7).padStart(2, '0')) // 07 à 21
  const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title={user?.display_name || 'Enseignant'} />

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="container-app py-0">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('rdv')}
              className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors ${
                activeTab === 'rdv' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'
              }`}
            >
              📅 Rendez-vous
            </button>
            <button
              onClick={() => setActiveTab('reunions')}
              className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors ${
                activeTab === 'reunions' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'
              }`}
            >
              👥 Réunions
            </button>
          </div>
        </div>
      </div>

      <div className="container-app">
        {activeTab === 'rdv' ? (
          <div className="animate-fade-in">
            {/* Bouton créer */}
            <button
              onClick={() => setShowCreateSlot(true)}
              className="btn-primary w-full mb-6"
            >
              + Créer un créneau
            </button>

            {/* Liste des RDV */}
            {Object.keys(appointmentsByDate).length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📅</div>
                <p className="empty-state-title">Aucun créneau</p>
                <p className="empty-state-text">Créez vos premiers créneaux de rendez-vous</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(appointmentsByDate).map(([date, apts]) => (
                  <div key={date}>
                    <h3 className="text-sm font-medium text-gray-500 mb-2 capitalize">
                      {formatDate(date)}
                    </h3>
                    <div className="space-y-2">
                      {apts.map(apt => (
                        <div
                          key={apt.id}
                          className={`card p-3 flex items-center justify-between ${
                            apt.status === 'booked' ? 'border-l-4 border-l-blue-500' : ''
                          }`}
                        >
                          <div>
                            <p className="font-medium">
                              {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
                            </p>
                            {apt.status === 'booked' ? (
                              <p className="text-sm text-blue-600">
                                🔵 {apt.child_name || 'Réservé'}
                              </p>
                            ) : (
                              <p className="text-sm text-green-600">🟢 Disponible</p>
                            )}
                          </div>
                          {apt.status === 'available' && (
                            <button
                              onClick={() => deleteSlot(apt.id)}
                              className="text-red-500 text-sm"
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="animate-fade-in">
            {/* Bouton créer réunion */}
            <button
              onClick={() => setShowCreateMeeting(true)}
              className="btn-primary w-full mb-6"
            >
              + Créer un sondage
            </button>

            {/* Liste des réunions */}
            {meetings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👥</div>
                <p className="empty-state-title">Aucune réunion</p>
                <p className="empty-state-text">Créez un sondage pour organiser une réunion</p>
              </div>
            ) : (
              <div className="space-y-4">
                {meetings.map(meeting => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    currentUserId={user.id}
                    onRespond={respondToSlot}
                    onConfirm={confirmMeetingSlot}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal création créneau - création manuelle libre */}
      {showCreateSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-6 animate-fade-in">
            <h2 className="text-lg font-semibold mb-4">Créer un créneau</h2>
            
            <div className="space-y-4">
              {/* Date */}
              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  value={slotDate}
                  onChange={(e) => setSlotDate(e.target.value)}
                  min={toInputDate(new Date())}
                  className="input"
                />
              </div>
              
              {/* Heure de début */}
              <div>
                <label className="label">Heure de début</label>
                <div className="flex space-x-2">
                  <select
                    value={slotStartHour}
                    onChange={(e) => setSlotStartHour(e.target.value)}
                    className="input flex-1"
                  >
                    {hours.map(h => (
                      <option key={h} value={h}>{h}h</option>
                    ))}
                  </select>
                  <select
                    value={slotStartMin}
                    onChange={(e) => setSlotStartMin(e.target.value)}
                    className="input flex-1"
                  >
                    {minutes.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Heure de fin */}
              <div>
                <label className="label">Heure de fin</label>
                <div className="flex space-x-2">
                  <select
                    value={slotEndHour}
                    onChange={(e) => setSlotEndHour(e.target.value)}
                    className="input flex-1"
                  >
                    {hours.map(h => (
                      <option key={h} value={h}>{h}h</option>
                    ))}
                  </select>
                  <select
                    value={slotEndMin}
                    onChange={(e) => setSlotEndMin(e.target.value)}
                    className="input flex-1"
                  >
                    {minutes.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Aperçu */}
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-sm text-gray-600">Créneau :</p>
                <p className="font-semibold text-primary-600">
                  {slotStartHour}:{slotStartMin} → {slotEndHour}:{slotEndMin}
                </p>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button 
                onClick={() => setShowCreateSlot(false)} 
                className="btn-secondary flex-1"
              >
                Fermer
              </button>
              <button 
                onClick={createSingleSlot} 
                disabled={isCreating}
                className="btn-primary flex-1"
              >
                {isCreating ? 'Création...' : 'Créer'}
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              💡 Après création, vous pouvez enchaîner avec un autre créneau
            </p>
          </div>
        </div>
      )}

      {/* Modal création réunion */}
      {showCreateMeeting && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-6 animate-fade-in my-4">
            <h2 className="text-lg font-semibold mb-4">Nouveau sondage</h2>
            
            <div className="space-y-4">
              <div>
                <label className="label">Titre de la réunion</label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="Ex: Conseil de cycle"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Créneaux proposés</label>
                {meetingSlots.map((slot, idx) => (
                  <div key={idx} className="flex items-center space-x-2 mb-2">
                    <input
                      type="date"
                      value={slot.date}
                      onChange={(e) => {
                        const newSlots = [...meetingSlots]
                        newSlots[idx].date = e.target.value
                        setMeetingSlots(newSlots)
                      }}
                      min={toInputDate(new Date())}
                      className="input flex-1"
                    />
                    <select
                      value={slot.start}
                      onChange={(e) => {
                        const newSlots = [...meetingSlots]
                        newSlots[idx].start = e.target.value
                        setMeetingSlots(newSlots)
                      }}
                      className="input w-24"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 8).map(h => (
                        <option key={h} value={`${h}:00`}>{h}h</option>
                      ))}
                    </select>
                    {meetingSlots.length > 1 && (
                      <button
                        onClick={() => setMeetingSlots(meetingSlots.filter((_, i) => i !== idx))}
                        className="text-red-500"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setMeetingSlots([...meetingSlots, { date: '', start: '14:00', end: '15:00' }])}
                  className="text-primary-600 text-sm"
                >
                  + Ajouter un créneau
                </button>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button onClick={() => setShowCreateMeeting(false)} className="btn-secondary flex-1">
                Annuler
              </button>
              <button onClick={createMeeting} className="btn-primary flex-1">
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Composant carte réunion
function MeetingCard({ meeting, currentUserId, onRespond, onConfirm }) {
  const isCreator = meeting.creator_code_id === currentUserId

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold">{meeting.title}</h3>
          <p className="text-sm text-gray-500">
            Par {meeting.creator?.display_name}
          </p>
        </div>
        <span className={`badge ${
          meeting.status === 'confirmed' ? 'badge-success' : 'badge-warning'
        }`}>
          {meeting.status === 'confirmed' ? 'Confirmé' : 'En attente'}
        </span>
      </div>

      <div className="space-y-2">
        {meeting.slots?.map(slot => {
          const myResponse = slot.responses?.find(r => r.teacher?.display_name)
          const availableCount = slot.responses?.filter(r => r.status === 'available').length || 0
          const isConfirmed = meeting.confirmed_slot_id === slot.id

          return (
            <div
              key={slot.id}
              className={`p-3 rounded-lg border ${
                isConfirmed ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">
                    {formatDate(slot.date, 'EEE d MMM')} à {formatTime(slot.start_time)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {availableCount} dispo.
                  </p>
                </div>
                
                {meeting.status === 'pending' && (
                  <div className="flex space-x-1">
                    <button
                      onClick={() => onRespond(slot.id, 'available')}
                      className={`px-3 py-1 text-xs rounded-full ${
                        myResponse?.status === 'available'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200'
                      }`}
                    >
                      ✓ Dispo
                    </button>
                    <button
                      onClick={() => onRespond(slot.id, 'unavailable')}
                      className={`px-3 py-1 text-xs rounded-full ${
                        myResponse?.status === 'unavailable'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-200'
                      }`}
                    >
                      ✗ Indispo
                    </button>
                  </div>
                )}

                {isCreator && meeting.status === 'pending' && availableCount > 0 && (
                  <button
                    onClick={() => onConfirm(meeting.id, slot.id)}
                    className="btn-success text-xs px-3 py-1"
                  >
                    Valider
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
