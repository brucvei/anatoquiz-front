import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.tsx';
import { I18nProvider } from './i18n';
import { ConfirmProvider } from './components/ConfirmProvider.tsx';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';
import { Header } from './components/Header.tsx';
import { Login } from './features/auth/Login.tsx';
import { SignUp } from './features/auth/SignUp.tsx';
import { QuizSearch } from './features/quiz-search/QuizSearch.tsx';
import { MyQuizzes } from './features/my-quizzes/MyQuizzes.tsx';
import { History } from './features/my-quizzes/History.tsx';
import { QuizBuilder } from './features/quiz-builder/QuizBuilder.tsx';
import { QuizPlay } from './features/quiz-play/QuizPlay.tsx';
import { QuizResult } from './features/quiz-result/QuizResult.tsx';
import { Ranking } from './features/ranking/Ranking.tsx';

function App() {
  return (
    <I18nProvider>
      <ConfirmProvider>
      <AuthProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<SignUp />} />
          <Route
            path="/buscar"
            element={
              <ProtectedRoute>
                <QuizSearch />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meus-quizzes"
            element={
              <ProtectedRoute>
                <MyQuizzes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/novo"
            element={
              <ProtectedRoute>
                <QuizBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/:id/editar"
            element={
              <ProtectedRoute>
                <QuizBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/:id/jogar"
            element={
              <ProtectedRoute>
                <QuizPlay />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/:id/resultado"
            element={
              <ProtectedRoute>
                <QuizResult />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ranking"
            element={
              <ProtectedRoute>
                <Ranking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/:id/ranking"
            element={
              <ProtectedRoute>
                <Ranking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/historico"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/buscar" replace />} />
        </Routes>
      </BrowserRouter>
      </AuthProvider>
      </ConfirmProvider>
    </I18nProvider>
  );
}

export default App;
