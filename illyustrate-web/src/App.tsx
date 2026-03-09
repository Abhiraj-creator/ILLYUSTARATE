import { useEffect, memo, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@application/stores/AuthStore'
import { MainLayout } from '@presentation/layouts/MainLayout'
import { LoginPage } from '@presentation/pages/LoginPage'
import { DashboardPage } from '@presentation/pages/DashboardPage'
import { RepositoryPage } from '@presentation/pages/RepositoryPage'
import { SettingsPage } from '@presentation/pages/SettingsPage'
import { Logo } from '@presentation/components/Logo'
import { ROUTES } from '@shared/constants'

// Memoized page components for better performance
const MemoizedDashboard = memo(DashboardPage)
const MemoizedRepository = memo(RepositoryPage)
const MemoizedSettings = memo(SettingsPage)

function App() {
  const { checkSession, initializeAuth, isLoading, isAuthenticated, user } = useAuthStore()
  const [showLoader, setShowLoader] = useState(true)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Check if we just came back from OAuth redirect
    const urlParams = new URLSearchParams(window.location.search);
    const isOAuthRedirect = urlParams.has('code') || window.location.hash.includes('access_token');

    // Quick check from persisted storage first
    const hasStoredAuth = !!user;

    // Mark as ready early if we have a session or redirect to avoid flickering
    if (hasStoredAuth || isOAuthRedirect) {
      setIsReady(true);
      setShowLoader(false);
    }

    // Always verify session in background, but don't block UI if we have a cached user
    const verifyAndInit = async () => {
      try {
        await checkSession();
      } finally {
        setShowLoader(false);
        setIsReady(true);
      }
    };

    verifyAndInit();

    const cleanup = initializeAuth();
    return cleanup;
  }, [checkSession, initializeAuth]); // user removed to stop infinite-ish loop re-triggering this effect unnecessarily

  // Loader duration fail-safe
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
      setShowLoader(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if ((isLoading && showLoader) || !isReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <Logo size={64} className="animate-pulse mb-4" />
        <div className="w-48 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-400 to-green-400 animate-[loading_1s_ease-in-out_infinite]"
            style={{ width: '30%', animation: 'slide 1s ease-in-out infinite' }} />
        </div>
        <style>{`
          @keyframes slide {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(400%); }
          }
        `}</style>
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
