import { useRouter } from 'next/router'
import { useAuth } from '@/pages/_app'

export default function Header({ title, showBack = false, showLogout = true }) {
  const router = useRouter()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const handleBack = () => {
    router.back()
  }

  const getProfileBadge = () => {
    if (!user) return null
    
    const badges = {
      admin: { label: 'Admin', color: 'bg-purple-100 text-purple-800' },
      teacher: { label: user.display_name || 'Enseignant', color: 'bg-blue-100 text-blue-800' },
      parent: { label: user.class_name || 'Parent', color: 'bg-green-100 text-green-800' }
    }
    
    const badge = badges[user.profile]
    return (
      <span className={`badge ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="container-app py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {showBack && (
              <button
                onClick={handleBack}
                className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h1 className="font-semibold text-gray-900">{title}</h1>
              {user && (
                <div className="mt-0.5">
                  {getProfileBadge()}
                </div>
              )}
            </div>
          </div>
          
          {showLogout && user && (
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Déconnexion
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
