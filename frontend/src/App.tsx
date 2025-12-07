import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from './theme';
import { GlobalStyles } from './styles/GlobalStyles';
import { AuthProvider } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import { Home } from './pages/Home';
import { Profile } from './pages/Profile';
import { Leaderboard } from './pages/Leaderboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Reviews } from './pages/Reviews';
import { CreateReview } from './pages/CreateReview';
import { Rewards } from './pages/Rewards';
import { Achievements } from './pages/Achievements';
import { Moderation } from './pages/Moderation';
import { Map } from './pages/Map';
import { CreatePlacePage } from './pages/CreatePlace';
import { MySubmissionsPage } from './pages/MySubmissions';
import { PlaceModerationPage } from './pages/PlaceModeration';
import { BulkUploadPage } from './pages/BulkUploadPage';
import { CategoriesManagementPage } from './pages/CategoriesManagementPage';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <AuthProvider>
        <Router>
          <div className="App">
            <Header />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rewards"
                element={
                  <ProtectedRoute>
                    <Rewards />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/achievements"
                element={
                  <ProtectedRoute>
                    <Achievements />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reviews"
                element={
                  <ProtectedRoute>
                    <Reviews />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reviews/create"
                element={
                  <ProtectedRoute>
                    <CreateReview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/moderation"
                element={
                  <AdminRoute>
                    <Moderation />
                  </AdminRoute>
                }
              />
              <Route
                path="/map"
                element={
                  <ProtectedRoute>
                    <Map />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/places/create"
                element={
                  <ProtectedRoute>
                    <CreatePlacePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/places/my-submissions"
                element={
                  <ProtectedRoute>
                    <MySubmissionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/places/moderation"
                element={
                  <AdminRoute>
                    <PlaceModerationPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/places/bulk-upload"
                element={
                  <AdminRoute>
                    <BulkUploadPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/places/categories"
                element={
                  <AdminRoute>
                    <CategoriesManagementPage />
                  </AdminRoute>
                }
              />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
