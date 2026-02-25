import { useEffect, memo } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@application/stores/AuthStore'
import { MainLayout } from '@presentation/layouts/MainLayout'
import { LoginPage } from '@presentation/pages/LoginPage'
import { DashboardPage } from '@presentation/pages/DashboardPage'
import { RepositoryPage } from '@presentation/pages/RepositoryPage'
import { SettingsPage } from '@presentation/pages/SettingsPage'
import { ROUTES } from '@shared/constants'

// Memoized page components for better performance
const MemoizedDashboard = memo(DashboardPage)
const MemoizedRepository = memo(RepositoryPage)
const MemoizedSettings = memo(SettingsPage)

function App() {
  const { checkSession, isLoading, isAuthenticated } = useAuthStore()

  useEffect(() => {
    checkSession()
  }, [checkSession])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <Routes>
      <Route 
        path={ROUTES.LOGIN} 
        element={isAuthenticated ? <Navigate to={ROUTES.DASHBOARD} /> : <LoginPage />} 
      />
      <Route element={<MainLayout />}>
        <Route 
          path={ROUTES.DASHBOARD} 
          element={isAuthenticated ? <MemoizedDashboard /> : <Navigate to={ROUTES.LOGIN} />} 
        />
        <Route 
          path={ROUTES.REPOSITORY} 
          element={isAuthenticated ? <MemoizedRepository /> : <Navigate to={ROUTES.LOGIN} />} 
        />
        <Route 
          path={ROUTES.GRAPH} 
          element={isAuthenticated ? <MemoizedRepository /> : <Navigate to={ROUTES.LOGIN} />} 
        />
        <Route 
          path={ROUTES.SETTINGS} 
          element={isAuthenticated ? <MemoizedSettings /> : <Navigate to={ROUTES.LOGIN} />} 
        />
        <Route 
          path={ROUTES.HOME} 
          element={<Navigate to={isAuthenticated ? ROUTES.DASHBOARD : ROUTES.LOGIN} />} 
        />
      </Route>
    </Routes>
  )
}

export default App
