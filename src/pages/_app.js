import '@/styles/globals.css'
import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '@/lib/supabase'

// Contexte d'authentification
export const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

export default function App({ Component, pageProps }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Vérifier si un code est stocké
    const storedCode = localStorage.getItem('ecole_martel_code')
    if (storedCode) {
      checkCode(storedCode)
    } else {
      setLoading(false)
    }
  }, [])

  const checkCode = async (code) => {
    try {
      const { data, error } = await supabase
        .from('access_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single()

      if (data && !error) {
        setUser(data)
        localStorage.setItem('ecole_martel_code', code.toUpperCase())
      } else {
        localStorage.removeItem('ecole_martel_code')
        setUser(null)
      }
    } catch (err) {
      console.error('Erreur vérification code:', err)
      setUser(null)
    }
    setLoading(false)
  }

  const login = async (code) => {
    setLoading(true)
    await checkCode(code)
    return user !== null
  }

  const logout = () => {
    localStorage.removeItem('ecole_martel_code')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, checkCode }}>
      <div className="min-h-screen bg-gray-50">
        <Component {...pageProps} />
      </div>
    </AuthContext.Provider>
  )
}
