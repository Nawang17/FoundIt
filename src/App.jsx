import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import Header from "./components/Header";
import LoginPage from "./views/Login/Login";
import RegisterPage from "./views/Register/Register";
import HomePage from "./views/Home/Home";
import CreatePostPage from "./views/CreatePost/CreatePost";
import ProfilePage from "./views/Profile/Profile";
function App() {
  return (
    <BrowserRouter>
      <MantineProvider>
        <Notifications />
        {/* App Navigation Header */}
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/create-post" element={<CreatePostPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </MantineProvider>
    </BrowserRouter>
  );
}

export default App;
