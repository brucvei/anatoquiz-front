import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { I18nProvider } from './i18n';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Header } from './components/Header';
import { Login } from './features/auth/Login';
import { SignUp } from './features/auth/SignUp';
import { QuizSearch } from './features/quiz-search/QuizSearch';
import { MyQuizzes } from './features/my-quizzes/MyQuizzes';
import { History } from './features/my-quizzes/History';
import { QuizBuilder } from './features/quiz-builder/QuizBuilder';
import { QuizPlay } from './features/quiz-play/QuizPlay';
import { QuizResult } from './features/quiz-result/QuizResult';
import { Ranking } from './features/ranking/Ranking';

function App() {
  return (
    <I18nProvider>
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
          <Route path="/" element={<Navigate to="/buscar" replace />} />
        </Routes>
      </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
