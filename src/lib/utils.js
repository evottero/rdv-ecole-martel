import { format, parseISO, isAfter, isBefore, addDays, startOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'

// Formater une date en français
export function formatDate(date, formatStr = 'EEEE d MMMM') {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, formatStr, { locale: fr })
}

// Formater une heure
export function formatTime(time) {
  if (!time) return ''
  // time est au format "HH:MM:SS" ou "HH:MM"
  return time.substring(0, 5)
}

// Formater date + heure pour affichage
export function formatDateTime(date, time) {
  return `${formatDate(date, 'EEE d MMM')} à ${formatTime(time)}`
}

// Vérifier si une date est dans le futur
export function isFutureDate(date) {
  const d = typeof date === 'string' ? parseISO(date) : date
  return isAfter(startOfDay(d), startOfDay(new Date()))
}

// Vérifier si une date est aujourd'hui ou dans le futur
export function isTodayOrFuture(date) {
  const d = typeof date === 'string' ? parseISO(date) : date
  const today = startOfDay(new Date())
  return !isBefore(startOfDay(d), today)
}

// Générer les prochains jours (pour le calendrier)
export function getNextDays(count = 14) {
  const days = []
  for (let i = 0; i < count; i++) {
    days.push(addDays(new Date(), i))
  }
  return days
}

// Formater pour input date
export function toInputDate(date) {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'yyyy-MM-dd')
}

// Capitaliser la première lettre
export function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Générer des créneaux horaires
export function generateTimeSlots(startHour, endHour, durationMinutes = 15) {
  const slots = []
  let currentMinutes = startHour * 60
  const endMinutes = endHour * 60
  
  while (currentMinutes + durationMinutes <= endMinutes) {
    const startH = Math.floor(currentMinutes / 60)
    const startM = currentMinutes % 60
    const endM = currentMinutes + durationMinutes
    const endH = Math.floor(endM / 60)
    const endMin = endM % 60
    
    slots.push({
      start: `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`,
      end: `${String(endH).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`
    })
    
    currentMinutes += durationMinutes
  }
  
  return slots
}
