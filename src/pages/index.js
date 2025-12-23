import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from './_app'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  const { user, loading, checkCode } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      redirectUser(user)
    }
  }, [user, loading])

  const redirectUser = (userData) => {
    switch (userData.profile) {
      case 'admin':
        router.push('/admin')
        break
      case 'teacher':
        router.push('/teacher')
        break
      case 'partner':
        router.push('/teacher') // Les partenaires vont sur la même page (réunions)
        break
      case 'parent':
        router.push('/parent')
        break
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const { data, error: dbError } = await supabase
        .from('access_codes')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .eq('is_active', true)
        .single()

      if (dbError || !data) {
        setError('Code invalide. Vérifiez et réessayez.')
        setIsLoading(false)
        return
      }

      localStorage.setItem('ecole_martel_code', code.toUpperCase().trim())
      await checkCode(code.toUpperCase().trim())
      redirectUser(data)
    } catch (err) {
      setError('Erreur de connexion. Réessayez.')
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Logo et titre */}
      <div className="text-center mb-8">
        <div className="w-24 h-24 rounded-2xl overflow-hidden mx-auto mb-4 shadow-lg">
          <img 
            src="/icon-512.png" 
            alt="École Martel" 
            className="w-full h-full object-cover"
          />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">École Martel</h1>
        <p className="text-gray-600 mt-1">Rendez-vous & Réunions</p>
      </div>

      {/* Formulaire de connexion */}
      <div className="w-full max-w-sm">
        <div className="card p-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="code" className="label">
                Votre code d'accès
              </label>
              <input
                type="text"
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Entrez votre code"
                className="input text-center text-lg tracking-widest uppercase"
                autoComplete="off"
                autoCapitalize="characters"
                required
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !code.trim()}
              className="btn-primary w-full py-3"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <span className="loader mr-2"></span>
                  Connexion...
                </span>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>
        </div>

        {/* Aide */}
        <div className="mt-6 text-center">
          <div className="card p-4">
            <p className="text-sm text-gray-600">
              <strong>Parents :</strong> code de la classe<br />
              <span className="text-gray-500">(ex: CM2, CM1, CE2...)</span>
            </p>
            <div className="border-t border-gray-100 my-3"></div>
            <p className="text-sm text-gray-600">
              <strong>Enseignants / Partenaires :</strong><br />
              <span className="text-gray-500">code personnel</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
