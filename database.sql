-- =============================================
-- 🏫 École Martel - Script de création de la base de données
-- =============================================
-- À exécuter dans Supabase > SQL Editor > New query > Run
-- =============================================

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

-- Table des réunions (sondages)
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

-- Table des créneaux proposés pour les réunions
CREATE TABLE meeting_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des réponses aux sondages de réunion
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

-- =============================================
-- Sécurité : Row Level Security (RLS)
-- =============================================

ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_responses ENABLE ROW LEVEL SECURITY;

-- Politiques de lecture (tout le monde peut lire)
CREATE POLICY "Lecture publique access_codes" ON access_codes FOR SELECT USING (true);
CREATE POLICY "Lecture publique appointments" ON appointments FOR SELECT USING (true);
CREATE POLICY "Lecture publique meetings" ON meetings FOR SELECT USING (true);
CREATE POLICY "Lecture publique meeting_slots" ON meeting_slots FOR SELECT USING (true);
CREATE POLICY "Lecture publique meeting_responses" ON meeting_responses FOR SELECT USING (true);

-- Politiques d'écriture (tout le monde peut écrire - simplifié pour usage école)
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

-- =============================================
-- Données initiales
-- =============================================

-- Code Admin (obligatoire)
INSERT INTO access_codes (code, profile, display_name) 
VALUES ('ADMIN', 'admin', 'Administration');

-- Exemples d'enseignants (à personnaliser selon ton école)
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

-- =============================================
-- ✅ Installation terminée !
-- =============================================
-- Codes créés :
-- - ADMIN (administration)
-- - DUPONT, MARTIN, BERNARD, PETIT, DURAND (enseignants)
-- - CM2, CM1, CE2, CE1, CP (parents)
-- 
-- Tu peux modifier ces codes depuis l'interface admin.
-- =============================================
