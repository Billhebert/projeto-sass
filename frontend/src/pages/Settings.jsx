import { useState, useEffect } from "react";
import { useAuth } from "../store/authStore";
import { toast } from "../store/toastStore";
import {
  useUserProfile,
  useUpdateProfile,
  useChangePassword,
} from "../hooks/useApi";
import "./Pages.css";

function Settings() {
  const { user, logout, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')

  // React Query hooks
  const { data: userProfile, isLoading: loadingProfile } = useUserProfile()
  const updateProfileMutation = useUpdateProfile()
  const changePasswordMutation = useChangePassword()

  // Profile form state
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
  })

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Preferences state
  const [preferences, setPreferences] = useState({
    language: 'pt-BR',
    theme: 'light',
    notifications: true,
    emailNotifications: true,
  })

  // Load preferences from localStorage
  useEffect(() => {
    const savedPreferences = localStorage.getItem('preferences')
    if (savedPreferences) {
      setPreferences(JSON.parse(savedPreferences))
    }
  }, [])

  // Update form when profile data is loaded
  useEffect(() => {
    if (userProfile) {
      setProfileData({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        email: userProfile.email || '',
        phone: userProfile.phone || '',
        company: userProfile.company || '',
      })
    } else if (user) {
      // Fallback to auth store data
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        company: user.company || '',
      })
    }
  }, [userProfile, user])
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);
      const response = await api.get("/user/profile");
      if (response.data.success) {
        const userData = response.data.data.user;
        setProfileData({
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          email: userData.email || "",
          phone: userData.phone || "",
          company: userData.company || "",
        });
      }
    } catch (err) {
      console.error("Error loading profile:", err);
      // Use data from auth store as fallback
      if (user) {
        setProfileData({
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          email: user.email || "",
          phone: user.phone || "",
          company: user.company || "",
        });
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePreferenceChange = (key) => {
    setPreferences((prev) => {
      const updated = {
        ...prev,
        [key]: typeof prev[key] === "boolean" ? !prev[key] : prev[key],
      };
      localStorage.setItem("preferences", JSON.stringify(updated));
      toast.success("Preferência salva");
      return updated;
    });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await updateProfileMutation.mutateAsync({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
        company: profileData.company,
      })
      
      if (response.success) {
        // Update user in auth store
        if (updateUser && response.data?.user) {
          updateUser(response.data.user)
        }
        toast.success('Perfil atualizado com sucesso!')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao atualizar perfil')
    }
  }
        toast.success("Perfil atualizado com sucesso!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Erro ao atualizar perfil");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('As senhas não conferem')
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('A nova senha deve ter no mínimo 8 caracteres')
      return
    }

    try {
      const response = await changePasswordMutation.mutateAsync({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })

      if (response.success) {
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
        toast.success('Senha alterada com sucesso!')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao alterar senha')
    }
  }

    if (passwordData.newPassword.length < 8) {
      toast.error("A nova senha deve ter no mínimo 8 caracteres");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/user/change-password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      if (response.data.success) {
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        toast.success("Senha alterada com sucesso!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Erro ao alterar senha");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm("Tem certeza que deseja fazer logout?")) {
      logout();
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Configurações</h1>
        <p>Gerencie sua conta e preferências</p>
      </div>

      <div className="settings-container">
        {/* Sidebar Navigation */}
        <div className="settings-sidebar">
          <button
            className={`settings-nav-item ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            Meu Perfil
          </button>
          <button
            className={`settings-nav-item ${activeTab === "password" ? "active" : ""}`}
            onClick={() => setActiveTab("password")}
          >
            Alterar Senha
          </button>
          <button
            className={`settings-nav-item ${activeTab === "preferences" ? "active" : ""}`}
            onClick={() => setActiveTab("preferences")}
          >
            Preferências
          </button>
          <hr
            style={{
              margin: "1rem 0",
              border: "none",
              borderTop: "1px solid #e0e0e0",
            }}
          />
          <button
            className="settings-nav-item"
            onClick={handleLogout}
            style={{ color: "#dc3545" }}
          >
            Fazer Logout
          </button>
        </div>

        {/* Main Content */}
        <div className="settings-content">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="settings-section">
              <h3>Informações do Perfil</h3>
              {loadingProfile ? (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>Carregando perfil...</p>
                </div>
              ) : (
                <form onSubmit={handleProfileSubmit} className="settings-form">
                  <div
                    className="form-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "1rem",
                    }}
                  >
                    <div className="form-group">
                      <label>Nome</label>
                      <input
                        type="text"
                        name="firstName"
                        value={profileData.firstName}
                        onChange={handleProfileChange}
                        placeholder="Seu nome"
                      />
                    </div>
                    <div className="form-group">
                      <label>Sobrenome</label>
                      <input
                        type="text"
                        name="lastName"
                        value={profileData.lastName}
                        onChange={handleProfileChange}
                        placeholder="Seu sobrenome"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={profileData.email}
                      disabled
                      style={{
                        backgroundColor: "#f5f5f5",
                        cursor: "not-allowed",
                      }}
                    />
                    <small style={{ color: "#666" }}>
                      O email não pode ser alterado
                    </small>
                  </div>

                  <div className="form-group">
                    <label>Telefone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleProfileChange}
                      placeholder="(11) 99999-9999"
                    />
                  </div>

                  <div className="form-group">
                    <label>Empresa</label>
                    <input
                      type="text"
                      name="company"
                      value={profileData.company}
                      onChange={handleProfileChange}
                      placeholder="Nome da sua empresa"
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Password Tab */}
          {activeTab === "password" && (
            <div className="settings-section">
              <h3>Alterar Senha</h3>
              <p style={{ color: "#666", marginBottom: "1.5rem" }}>
                Escolha uma senha forte com no mínimo 8 caracteres
              </p>
              <form onSubmit={handlePasswordSubmit} className="settings-form">
                <div className="form-group">
                  <label>Senha Atual</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Digite sua senha atual"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Nova Senha</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Digite a nova senha"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Confirmar Senha</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirme a nova senha"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={changePasswordMutation.isPending}
                >
                  {changePasswordMutation.isPending ? "Atualizando..." : "Atualizar Senha"}
                </button>
              </form>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === "preferences" && (
            <div className="settings-section">
              <h3>Preferências</h3>
              <div className="preference-item">
                <div>
                  <h4>Idioma</h4>
                  <p style={{ color: "#999", marginTop: "0.5rem" }}>
                    Escolha seu idioma preferido
                  </p>
                </div>
                <select
                  value={preferences.language}
                  onChange={(e) =>
                    setPreferences({ ...preferences, language: e.target.value })
                  }
                  style={{ width: "150px" }}
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Español</option>
                </select>
              </div>

              <div className="preference-item">
                <div>
                  <h4>Tema</h4>
                  <p style={{ color: "#999", marginTop: "0.5rem" }}>
                    Escolha entre tema claro ou escuro
                  </p>
                </div>
                <select
                  value={preferences.theme}
                  onChange={(e) =>
                    setPreferences({ ...preferences, theme: e.target.value })
                  }
                  style={{ width: "150px" }}
                >
                  <option value="light">Claro</option>
                  <option value="dark">Escuro</option>
                  <option value="auto">Automático</option>
                </select>
              </div>

              <div className="preference-item">
                <div>
                  <h4>Notificações no Dashboard</h4>
                  <p style={{ color: "#999", marginTop: "0.5rem" }}>
                    Receba alertas sobre suas contas
                  </p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.notifications}
                    onChange={() => handlePreferenceChange("notifications")}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="preference-item">
                <div>
                  <h4>Notificações por Email</h4>
                  <p style={{ color: "#999", marginTop: "0.5rem" }}>
                    Receba atualizações importantes por email
                  </p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.emailNotifications}
                    onChange={() =>
                      handlePreferenceChange("emailNotifications")
                    }
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
