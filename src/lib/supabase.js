import { createClient } from '@supabase/supabase-js'

// Ces valeurs seront remplacées par tes propres clés Supabase
// Voir le guide d'installation pour obtenir ces clés
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================
// TYPES DE DONNÉES
// ============================================

// Profils utilisateur
export const USER_PROFILES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  PARENT: 'parent'
}

// Structure d'un code d'accès
// Table: access_codes
export const AccessCodeSchema = {
  id: 'uuid',
  code: 'string',          // Ex: "ADMIN", "DUPONT", "CM2"
  profile: 'string',       // admin | teacher | parent
  display_name: 'string',  // Ex: "M. Dupont", "Classe CM2"
  class_name: 'string',    // Pour enseignants: "CM2", pour parents: "CM2"
  is_active: 'boolean',
  created_at: 'timestamp'
}

// Structure d'un créneau de rendez-vous
// Table: appointments
export const AppointmentSchema = {
  id: 'uuid',
  teacher_code_id: 'uuid',  // Référence vers access_codes
  date: 'date',             // Ex: "2024-01-15"
  start_time: 'time',       // Ex: "09:00"
  end_time: 'time',         // Ex: "09:15"
  status: 'string',         // available | booked | completed | cancelled
  parent_code_id: 'uuid',   // Référence vers access_codes (nullable)
  child_name: 'string',     // Prénom de l'enfant (nullable)
  booked_at: 'timestamp',
  created_at: 'timestamp'
}

// Structure d'une réunion (sondage)
// Table: meetings
export const MeetingSchema = {
  id: 'uuid',
  title: 'string',
  description: 'string',
  creator_code_id: 'uuid',
  status: 'string',         // pending | confirmed | cancelled
  confirmed_slot_id: 'uuid',
  response_deadline: 'timestamp',
  created_at: 'timestamp'
}

// Structure d'un créneau proposé pour une réunion
// Table: meeting_slots
export const MeetingSlotSchema = {
  id: 'uuid',
  meeting_id: 'uuid',
  date: 'date',
  start_time: 'time',
  end_time: 'time',
  created_at: 'timestamp'
}

// Structure d'une réponse à un sondage
// Table: meeting_responses
export const MeetingResponseSchema = {
  id: 'uuid',
  slot_id: 'uuid',
  teacher_code_id: 'uuid',
  status: 'string',         // available | unavailable
  created_at: 'timestamp'
}

// ============================================
// SCRIPT SQL POUR CRÉER LES TABLES
// À exécuter dans Supabase Dashboard > SQL Editor
// ============================================
export const SQL_SCHEMA = `
-- Table des codes d'accès
CREATE TABLE access_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  profile TEXT NOT NULL CHECK (profile IN ('admin', 'teacher', 'parent')),
  display_name TEXT,
  class_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des rendez-vous
CREATE TABLE appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_code_id UUID REFERENCES access_codes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'booked', 'completed', 'cancelled')),
  parent_code_id UUID REFERENCES access_codes(id) ON DELETE SET NULL,
  child_name TEXT,
  booked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des réunions
CREATE TABLE meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  creator_code_id UUID REFERENCES access_codes(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  confirmed_slot_id UUID,
  response_deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des créneaux de réunion
CREATE TABLE meeting_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des réponses aux sondages
CREATE TABLE meeting_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id UUID REFERENCES meeting_slots(id) ON DELETE CASCADE,
  teacher_code_id UUID REFERENCES access_codes(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('available', 'unavailable')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(slot_id, teacher_code_id)
);

-- Index pour les performances
CREATE INDEX idx_appointments_teacher ON appointments(teacher_code_id);
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_meeting_slots_meeting ON meeting_slots(meeting_id);
CREATE INDEX idx_meeting_responses_slot ON meeting_responses(slot_id);

-- Activer la sécurité Row Level Security (RLS)
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_responses ENABLE ROW LEVEL SECURITY;

-- Politiques de sécurité (lecture publique pour simplifier)
CREATE POLICY "Lecture publique access_codes" ON access_codes FOR SELECT USING (true);
CREATE POLICY "Lecture publique appointments" ON appointments FOR SELECT USING (true);
CREATE POLICY "Lecture publique meetings" ON meetings FOR SELECT USING (true);
CREATE POLICY "Lecture publique meeting_slots" ON meeting_slots FOR SELECT USING (true);
CREATE POLICY "Lecture publique meeting_responses" ON meeting_responses FOR SELECT USING (true);

-- Politiques d'écriture (tout le monde peut écrire - simplifié)
CREATE POLICY "Écriture publique access_codes" ON access_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "Modification publique access_codes" ON access_codes FOR UPDATE USING (true);
CREATE POLICY "Suppression publique access_codes" ON access_codes FOR DELETE USING (true);

CREATE POLICY "Écriture publique appointments" ON appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Modification publique appointments" ON appointments FOR UPDATE USING (true);
CREATE POLICY "Suppression publique appointments" ON appointments FOR DELETE USING (true);

CREATE POLICY "Écriture publique meetings" ON meetings FOR INSERT WITH CHECK (true);
CREATE POLICY "Modification publique meetings" ON meetings FOR UPDATE USING (true);
CREATE POLICY "Suppression publique meetings" ON meetings FOR DELETE USING (true);

CREATE POLICY "Écriture publique meeting_slots" ON meeting_slots FOR INSERT WITH CHECK (true);
CREATE POLICY "Modification publique meeting_slots" ON meeting_slots FOR UPDATE USING (true);
CREATE POLICY "Suppression publique meeting_slots" ON meeting_slots FOR DELETE USING (true);

CREATE POLICY "Écriture publique meeting_responses" ON meeting_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Modification publique meeting_responses" ON meeting_responses FOR UPDATE USING (true);
CREATE POLICY "Suppression publique meeting_responses" ON meeting_responses FOR DELETE USING (true);

-- Données initiales : Code Admin
INSERT INTO access_codes (code, profile, display_name) 
VALUES ('ADMIN', 'admin', 'Administration');

-- Exemples d'enseignants (à personnaliser)
INSERT INTO access_codes (code, profile, display_name, class_name) VALUES
('DUPONT', 'teacher', 'M. Dupont', 'CM2'),
('MARTIN', 'teacher', 'Mme Martin', 'CM1'),
('BERNARD', 'teacher', 'M. Bernard', 'CE2'),
('PETIT', 'teacher', 'Mme Petit', 'CE1'),
('DURAND', 'teacher', 'M. Durand', 'CP');

-- Codes parents par classe
INSERT INTO access_codes (code, profile, display_name, class_name) VALUES
('CM2', 'parent', 'Parents CM2', 'CM2'),
('CM1', 'parent', 'Parents CM1', 'CM1'),
('CE2', 'parent', 'Parents CE2', 'CE2'),
('CE1', 'parent', 'Parents CE1', 'CE1'),
('CP', 'parent', 'Parents CP', 'CP');
`

export default supabase
