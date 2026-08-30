import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Header } from './components/Header';
import { Login } from './features/auth/Login';
import { SignUp } from './features/auth/SignUp';
import { QuizSearch } from './features/quiz-search/QuizSearch';
import { MyQuizzes } from './features/my-quizzes/MyQuizzes';

function App() {
  return (
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
          <Route path="/" element={<Navigate to="/buscar" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
