import { useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useNavigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { PwaProvider } from './contexts/PwaContext';
import { ToastProvider } from './contexts/ToastContext';
import { AboutPage } from './pages/AboutPage';
import { ChatPage } from './pages/ChatPage';
import { CompleteProfilePage, EditProfilePage } from './pages/CompleteProfilePage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { HomePage } from './pages/HomePage';
import { KindnessChainPage } from './pages/KindnessChainPage';
import { LoginPage } from './pages/LoginPage';
import { MessagesPage } from './pages/MessagesPage';
import { ModerationPage } from './pages/ModerationPage';
import { MyActivitiesPage } from './pages/MyActivitiesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { RequestDetailPage } from './pages/RequestDetailPage';
import { RequestFormPage } from './pages/RequestFormPage';
import { RequestsListPage } from './pages/RequestsListPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SettingsPage } from './pages/SettingsPage';
import { WelcomePage } from './pages/WelcomePage';

function RecoveryWatcher() {
  const { isPasswordRecovery } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isPasswordRecovery) {
      navigate('/auth/reset-password', { replace: true });
    }
  }, [isPasswordRecovery, navigate]);

  return null;
}

function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <div className="rounded-2xl border border-brand-surface bg-white p-8">
        <h1 className="mb-2 text-2xl font-extrabold text-brand-primary">صفحه پیدا نشد</h1>
        <p className="mb-5 text-sm text-brand-text/70">
          نشانی موردنظر وجود ندارد یا جابه‌جا شده است.
        </p>
        <Link
          to="/"
          className="inline-flex rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-green"
        >
          بازگشت به خانه
        </Link>
      </div>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ToastProvider>
        <AuthProvider>
          <NotificationsProvider>
            <ChatProvider>
              <PwaProvider>
                <RecoveryWatcher />
                <Routes>
                  <Route element={<Layout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/welcome" element={<WelcomePage />} />
                    <Route path="/auth/login" element={<LoginPage />} />
                    <Route path="/auth/register" element={<RegisterPage />} />
                    <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

                    <Route
                      path="/profile/complete"
                      element={
                        <ProtectedRoute>
                          <CompleteProfilePage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route
                      path="/profile/edit"
                      element={
                        <ProtectedRoute>
                          <EditProfilePage />
                        </ProtectedRoute>
                      }
                    />

                    <Route path="/requests" element={<RequestsListPage />} />
                    <Route
                      path="/requests/new"
                      element={
                        <ProtectedRoute>
                          <RequestFormPage mode="create" />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/requests/:id" element={<RequestDetailPage />} />
                    <Route
                      path="/requests/:id/edit"
                      element={
                        <ProtectedRoute>
                          <RequestFormPage mode="edit" />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/messages"
                      element={
                        <ProtectedRoute>
                          <MessagesPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/messages/:id"
                      element={
                        <ProtectedRoute>
                          <ChatPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/notifications"
                      element={
                        <ProtectedRoute>
                          <NotificationsPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/moderation"
                      element={
                        <ProtectedRoute>
                          <ModerationPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/my-activities"
                      element={
                        <ProtectedRoute>
                          <MyActivitiesPage defaultTab="requests" />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/my-responses"
                      element={
                        <ProtectedRoute>
                          <MyActivitiesPage defaultTab="offers" />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/saved"
                      element={
                        <ProtectedRoute>
                          <MyActivitiesPage defaultTab="saved" />
                        </ProtectedRoute>
                      }
                    />

                    <Route path="/kindness-chain" element={<KindnessChainPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/settings" element={<SettingsPage />} />

                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                </Routes>
              </PwaProvider>
            </ChatProvider>
          </NotificationsProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
