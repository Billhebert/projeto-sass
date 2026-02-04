import { create } from "zustand";
import api from "../services/api";

export const useAuthStore = create((set) => ({
  token: null,
  user: null,
  loading: false,
  error: null,

  loadToken: () => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (token && user) {
      set({ token, user: JSON.parse(user) });
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post("/auth/login", { email, password });
      const { data, token, user } = response.data;

      // Handle both response formats
      const actualToken = token || data?.token;
      const actualUser = user || data?.user;

      if (!actualToken || !actualUser) {
        throw new Error("Invalid response format: missing token or user");
      }

      localStorage.setItem("token", actualToken);
      localStorage.setItem("user", JSON.stringify(actualUser));
      set({ token: actualToken, user: actualUser, loading: false });
      return true;
    } catch (error) {
      let message = "Login failed";

      // Handle different error types
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        switch (status) {
          case 400:
            message = data.error || "Invalid email or password";
            break;
          case 401:
            message = data.error || "Invalid credentials";
            break;
          case 409:
            message = data.error || "Account already exists";
            break;
          case 500:
            message = "Server error - please try again later";
            break;
          default:
            message = data.error || error.message || "Login failed";
        }
      } else if (error.request) {
        message = "Network error - please check your connection";
      }

      set({ error: message, loading: false });
      return false;
    }
  },

  register: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post("/auth/register", data);
      const { data: responseData, token, user } = response.data;

      // Handle both response formats
      const actualToken = token || responseData?.token;
      const actualUser = user || responseData?.user;

      if (!actualToken || !actualUser) {
        throw new Error("Invalid response format: missing token or user");
      }

      localStorage.setItem("token", actualToken);
      localStorage.setItem("user", JSON.stringify(actualUser));
      set({ token: actualToken, user: actualUser, loading: false });
      return true;
    } catch (error) {
      let message = "Registration failed";

      // Handle different error types
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        switch (status) {
          case 400:
            message = data.error || "Invalid input data";
            break;
          case 409:
            message = data.error || "Email already registered";
            break;
          case 500:
            message = "Server error - please try again later";
            break;
          default:
            message = data.error || error.message || "Registration failed";
        }
      } else if (error.request) {
        message = "Network error - please check your connection";
      }

      set({ error: message, loading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ token: null, user: null, error: null });
  },

  updateUser: (userData) => {
    set((state) => {
      const updatedUser = { ...state.user, ...userData };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      return { user: updatedUser };
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Alias for convenience
export const useAuth = useAuthStore;
