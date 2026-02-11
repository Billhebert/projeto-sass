import React, { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardFooter,
  Button, 
  Input, 
  Switch,
  Avatar,
  Modal,
  ModalFooter
} from '@/components/ui';
import { 
  useProfile, 
  useNotificationSettings,
  useUpdateNotifications,
  useChangePassword,
  useAPITokens,
  useCreateAPIToken,
  useDeleteAPIToken
} from '../hooks/useSettings';
import { SettingsIcon, UserIcon, BellIcon, ShieldIcon, KeyIcon, TrashIcon } from '@/components/icons';
import { tokens } from '@/styles/tokens';

export const SettingsPage: React.FC = () => {
  const { data: profile, isLoading: loadingProfile } = useProfile();
  const { data: notifications } = useNotificationSettings();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [newToken, setNewToken] = useState({ name: '', permissions: [] as string[] });

  const { mutate: updateNotifications } = useUpdateNotifications();
  const { mutate: changePassword } = useChangePassword();
  const { mutate: createToken } = useCreateAPIToken();
  const { mutate: deleteToken } = useDeleteAPIToken();

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: <UserIcon size={18} /> },
    { id: 'notifications', label: 'Notificações', icon: <BellIcon size={18} /> },
    { id: 'security', label: 'Segurança', icon: <ShieldIcon size={18} /> },
    { id: 'api', label: 'API Tokens', icon: <KeyIcon size={18} /> },
  ];

  const tabsStyle: React.CSSProperties = {
    display: 'flex',
    gap: tokens.spacing[1],
    marginBottom: tokens.spacing[6],
    borderBottom: `1px solid ${tokens.colors.neutral[200]}`,
    paddingBottom: tokens.spacing.spacing,
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing[2],
    padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: isActive ? tokens.colors.primary[600] : tokens.colors.neutral[600],
    borderBottom: `2px solid ${isActive ? tokens.colors.primary[600] : 'transparent'}`,
    fontWeight: isActive ? tokens.typography.fontWeight.medium : tokens.typography.fontWeight.normal,
    fontFamily: tokens.typography.fontFamily.sans,
    transition: `all ${tokens.transitions.fast}`,
  });

  const headerStyle: React.CSSProperties = {
    marginBottom: tokens.spacing[6],
  };

  const titleStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize['3xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.neutral[900],
    fontFamily: tokens.typography.fontFamily.sans,
    marginBottom: tokens.spacing[2],
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: tokens.spacing[8],
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.neutral[900],
    fontFamily: tokens.typography.fontFamily.sans,
    marginBottom: tokens.spacing[4],
  };

  const formGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: tokens.spacing[4],
  };

  const settingRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${tokens.spacing[4]} 0`,
    borderBottom: `1px solid ${tokens.colors.neutral[100]}`,
  };

  const settingInfoStyle: React.CSSProperties = {
    flex: 1,
  };

  const settingLabelStyle: React.CSSProperties = {
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.neutral[900],
    fontFamily: tokens.typography.fontFamily.sans,
    marginBottom: tokens.spacing[1],
  };

  const settingDescStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.neutral[600],
    fontFamily: tokens.typography.fontFamily.sans,
  };

  const loadingStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
  };

  const handlePasswordChange = () => {
    if (passwords.new === passwords.confirm && passwords.new.length >= 8) {
      changePassword(passwords);
      setShowPasswordModal(false);
      setPasswords({ current: '', new: '', confirm: '' });
    }
  };

  const handleCreateToken = () => {
    if (newToken.name) {
      createToken({ name: newToken.name, permissions: newToken.permissions });
      setShowTokenModal(false);
      setNewToken({ name: '', permissions: [] });
    }
  };

  const renderProfileTab = () => (
    <div style={sectionStyle}>
      <h3 style={sectionTitleStyle}>Informações Pessoais</h3>
      <Card>
        <CardContent>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[6], marginBottom: tokens.spacing[6] }}>
            <Avatar name={profile?.name} size="xl" />
            <div>
              <div style={{ fontWeight: tokens.typography.fontWeight.medium, fontSize: tokens.typography.fontSize.lg }}>
                {profile?.name}
              </div>
              <div style={{ color: tokens.colors.neutral[600], fontFamily: tokens.typography.fontFamily.sans }}>
                {profile?.email}
              </div>
            </div>
          </div>

          <div style={formGridStyle}>
            <Input label="Nome" value={profile?.name || ''} disabled />
            <Input label="Email" type="email" value={profile?.email || ''} disabled />
            <Input label="Telefone" placeholder="(00) 00000-0000" />
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="primary">Salvar Alterações</Button>
        </CardFooter>
      </Card>
    </div>
  );

  const renderNotificationsTab = () => (
    <div style={sectionStyle}>
      <h3 style={sectionTitleStyle}>Preferências de Notificação</h3>
      <Card>
        <CardContent>
          <div style={settingRowStyle}>
            <div style={settingInfoStyle}>
              <div style={settingLabelStyle}>Notificações de Pedidos</div>
              <div style={settingDescStyle}>Receba alertas sobre novos pedidos</div>
            </div>
            <Switch checked={notifications?.orders || false} onChange={() => {}} />
          </div>

          <div style={settingRowStyle}>
            <div style={settingInfoStyle}>
              <div style={settingLabelStyle}>Notificações de Pagamentos</div>
              <div style={settingDescStyle}>Receba alertas sobre pagamentos</div>
            </div>
            <Switch checked={notifications?.payments || false} onChange={() => {}} />
          </div>

          <div style={settingRowStyle}>
            <div style={settingInfoStyle}>
              <div style={settingLabelStyle}>Perguntas de Compradores</div>
              <div style={settingDescStyle}>Receba alertas sobre novas perguntas</div>
            </div>
            <Switch checked={notifications?.questions || false} onChange={() => {}} />
          </div>

          <div style={settingRowStyle}>
            <div style={settingInfoStyle}>
              <div style={settingLabelStyle}>Reclamações</div>
              <div style={settingDescStyle}>Receba alertas sobre novas reclamações</div>
            </div>
            <Switch checked={notifications?.claims || false} onChange={() => {}} />
          </div>

          <div style={settingRowStyle}>
            <div style={settingInfoStyle}>
              <div style={settingLabelStyle}>Relatórios Semanais</div>
              <div style={settingDescStyle}>Receba um resumo semanal das vendas</div>
            </div>
            <Switch checked={notifications?.weeklyReports || false} onChange={() => {}} />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSecurityTab = () => (
    <div style={sectionStyle}>
      <h3 style={sectionTitleStyle}>Segurança</h3>
      <Card>
        <CardContent>
          <div style={formGridStyle}>
            <Button variant="primary" onClick={() => setShowPasswordModal(true)}>
              Alterar Senha
            </Button>
            <Button variant="outline">
              Ativar Autenticação em 2 Fatores
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAPITab = () => (
    <div style={sectionStyle}>
      <h3 style={sectionTitleStyle}>Tokens de API</h3>
      <Card>
        <CardContent>
          <p style={{ marginBottom: tokens.spacing[4], color: tokens.colors.neutral[600] }}>
            Gerencie os tokens de acesso à API do Vendata.
          </p>
          <Button variant="primary" onClick={() => setShowTokenModal(true)}>
            Criar Novo Token
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  if (loadingProfile) {
    return (
      <MainLayout>
        <div style={loadingStyle}>
          <SettingsIcon size={48} />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Configurações</h1>
        <p style={{ color: tokens.colors.neutral[600], fontFamily: tokens.typography.fontFamily.sans }}>
          Gerencie suas preferências e informações da conta
        </p>
      </div>

      {/* Tabs */}
      <div style={tabsStyle}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            style={tabStyle(activeTab === tab.id)}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && renderProfileTab()}
      {activeTab === 'notifications' && renderNotificationsTab()}
      {activeTab === 'security' && renderSecurityTab()}
      {activeTab === 'api' && renderAPITab()}

      {/* Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Alterar Senha"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
          <Input
            label="Senha atual"
            type="password"
            value={passwords.current}
            onChange={(v) => setPasswords({ ...passwords, current: v })}
          />
          <Input
            label="Nova senha"
            type="password"
            value={passwords.new}
            onChange={(v) => setPasswords({ ...passwords, new: v })}
          />
          <Input
            label="Confirmar nova senha"
            type="password"
            value={passwords.confirm}
            onChange={(v) => setPasswords({ ...passwords, confirm: v })}
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowPasswordModal(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handlePasswordChange}>
            Alterar Senha
          </Button>
        </ModalFooter>
      </Modal>

      {/* Token Modal */}
      <Modal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        title="Criar Token de API"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
          <Input
            label="Nome do token"
            placeholder="Ex: Produção"
            value={newToken.name}
            onChange={(v) => setNewToken({ ...newToken, name: v })}
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowTokenModal(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleCreateToken}>
            Criar Token
          </Button>
        </ModalFooter>
      </Modal>
    </MainLayout>
  );
};

export default SettingsPage;
