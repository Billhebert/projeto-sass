import { useState } from "react";
import { Link } from "react-router-dom";
import { useToastStore } from "../store/toastStore";
import {
  useMPCustomers,
  useMPCustomerCards,
  useCreateMPCustomer,
  useUpdateMPCustomer,
  useDeleteMPCustomer,
  useDeleteMPCustomerCard,
} from "../hooks/useApi";
import "./MPCustomers.css";

function MPCustomers() {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("view"); // 'view', 'create', 'edit'
  const { showToast } = useToastStore();

  // Search
  const [searchEmail, setSearchEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [customerForm, setCustomerForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: {
      area_code: "",
      number: "",
    },
    identification: {
      type: "CPF",
      number: "",
    },
    address: {
      zip_code: "",
      street_name: "",
      street_number: "",
    },
  });

  // React Query hooks
  const {
    data: customers = [],
    isLoading: loading,
    refetch,
  } = useMPCustomers(searchQuery);

  const { data: customerCards = [] } = useMPCustomerCards(selectedCustomer?.id);

  const createCustomerMutation = useCreateMPCustomer();
  const updateCustomerMutation = useUpdateMPCustomer();
  const deleteCustomerMutation = useDeleteMPCustomer();
  const deleteCardMutation = useDeleteMPCustomerCard();

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchEmail);
  };

  const openViewModal = async (customer) => {
    setSelectedCustomer(customer);
    setModalType("view");
    setShowModal(true);
  };

  const openCreateModal = () => {
    setCustomerForm({
      email: "",
      first_name: "",
      last_name: "",
      phone: {
        area_code: "",
        number: "",
      },
      identification: {
        type: "CPF",
        number: "",
      },
      address: {
        zip_code: "",
        street_name: "",
        street_number: "",
      },
    });
    setModalType("create");
    setShowModal(true);
  };

  const openEditModal = (customer) => {
    setSelectedCustomer(customer);
    setCustomerForm({
      email: customer.email || "",
      first_name: customer.first_name || "",
      last_name: customer.last_name || "",
      phone: {
        area_code: customer.phone?.area_code || "",
        number: customer.phone?.number || "",
      },
      identification: {
        type: customer.identification?.type || "CPF",
        number: customer.identification?.number || "",
      },
      address: {
        zip_code: customer.address?.zip_code || "",
        street_name: customer.address?.street_name || "",
        street_number: customer.address?.street_number || "",
      },
    });
    setModalType("edit");
    setShowModal(true);
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      const data = {
        email: customerForm.email,
        first_name: customerForm.first_name || undefined,
        last_name: customerForm.last_name || undefined,
      };

      if (customerForm.phone.area_code && customerForm.phone.number) {
        data.phone = customerForm.phone;
      }

      if (customerForm.identification.number) {
        data.identification = customerForm.identification;
      }

      if (customerForm.address.zip_code) {
        data.address = customerForm.address;
      }

      await createCustomerMutation.mutateAsync(data);
      showToast("Cliente criado com sucesso", "success");
      setShowModal(false);
      refetch();
    } catch (error) {
      console.error("Error creating customer:", error);
      showToast("Erro ao criar cliente", "error");
    }
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    try {
      const data = {
        first_name: customerForm.first_name || undefined,
        last_name: customerForm.last_name || undefined,
      };

      if (customerForm.phone.area_code && customerForm.phone.number) {
        data.phone = customerForm.phone;
      }

      if (customerForm.identification.number) {
        data.identification = customerForm.identification;
      }

      if (customerForm.address.zip_code) {
        data.address = customerForm.address;
      }

      await updateCustomerMutation.mutateAsync({
        customerId: selectedCustomer.id,
        data,
      });
      showToast("Cliente atualizado com sucesso", "success");
      setShowModal(false);
      refetch();
    } catch (error) {
      console.error("Error updating customer:", error);
      showToast("Erro ao atualizar cliente", "error");
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (
      !window.confirm(
        "Deseja excluir este cliente? Esta acao nao pode ser desfeita.",
      )
    )
      return;

    try {
      await deleteCustomerMutation.mutateAsync(customerId);
      showToast("Cliente excluido com sucesso", "success");
      refetch();
    } catch (error) {
      console.error("Error deleting customer:", error);
      showToast("Erro ao excluir cliente", "error");
    }
  };

  const handleDeleteCard = async (customerId, cardId) => {
    if (!window.confirm("Deseja excluir este cartao?")) return;

    try {
      await deleteCardMutation.mutateAsync({ customerId, cardId });
      showToast("Cartao excluido com sucesso", "success");
    } catch (error) {
      console.error("Error deleting card:", error);
      showToast("Erro ao excluir cartao", "error");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getCardBrandIcon = (brand) => {
    const brands = {
      visa: "credit_card",
      mastercard: "credit_card",
      amex: "credit_card",
      elo: "credit_card",
      hipercard: "credit_card",
    };
    return brands[brand?.toLowerCase()] || "credit_card";
  };

  const actionLoading =
    createCustomerMutation.isPending ||
    updateCustomerMutation.isPending ||
    deleteCustomerMutation.isPending ||
    deleteCardMutation.isPending;

  return (
    <div className="mp-customers">
      <header className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">people</span>
            Clientes
          </h1>
          <p>Gerencie clientes do Mercado Pago</p>
        </div>
        <div className="header-actions">
          <Link to="/mp" className="btn btn-secondary">
            <span className="material-icons">arrow_back</span>
            Voltar
          </Link>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <span className="material-icons">person_add</span>
            Novo Cliente
          </button>
        </div>
      </header>

      {/* Search */}
      <form className="search-section" onSubmit={handleSearch}>
        <div className="search-input">
          <span className="material-icons">search</span>
          <input
            type="email"
            placeholder="Buscar por email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Buscar
        </button>
      </form>

      {/* Customers List */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Carregando...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="empty-state">
          <span className="material-icons">person_search</span>
          <h3>Nenhum cliente encontrado</h3>
          <p>Crie um novo cliente ou ajuste sua busca</p>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <span className="material-icons">person_add</span>
            Novo Cliente
          </button>
        </div>
      ) : (
        <div className="customers-container">
          <div className="customers-grid">
            {customers.map((customer) => (
              <div key={customer.id} className="customer-card">
                <div className="customer-avatar">
                  {(customer.first_name || customer.email || "C")
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div className="customer-info">
                  <h3>
                    {customer.first_name || customer.last_name
                      ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
                      : "Cliente sem nome"}
                  </h3>
                  <p className="customer-email">{customer.email}</p>
                  {customer.identification?.number && (
                    <p className="customer-doc">
                      {customer.identification.type}:{" "}
                      {customer.identification.number}
                    </p>
                  )}
                </div>
                <div className="customer-meta">
                  <span className="meta-item">
                    <span className="material-icons">credit_card</span>
                    {customer.cards?.length || 0} cartoes
                  </span>
                  <span className="meta-item">
                    <span className="material-icons">calendar_today</span>
                    {formatDate(customer.date_created)}
                  </span>
                </div>
                <div className="customer-actions">
                  <button
                    className="btn-action"
                    title="Ver detalhes"
                    onClick={() => openViewModal(customer)}
                  >
                    <span className="material-icons">visibility</span>
                  </button>
                  <button
                    className="btn-action edit"
                    title="Editar"
                    onClick={() => openEditModal(customer)}
                  >
                    <span className="material-icons">edit</span>
                  </button>
                  <button
                    className="btn-action delete"
                    title="Excluir"
                    onClick={() => handleDeleteCustomer(customer.id)}
                    disabled={actionLoading}
                  >
                    <span className="material-icons">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {modalType === "view" && "Detalhes do Cliente"}
                {modalType === "create" && "Novo Cliente"}
                {modalType === "edit" && "Editar Cliente"}
              </h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="modal-body">
              {modalType === "view" && selectedCustomer && (
                <>
                  <div className="customer-profile">
                    <div className="profile-avatar">
                      {(
                        selectedCustomer.first_name ||
                        selectedCustomer.email ||
                        "C"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div className="profile-info">
                      <h3>
                        {selectedCustomer.first_name ||
                        selectedCustomer.last_name
                          ? `${selectedCustomer.first_name || ""} ${selectedCustomer.last_name || ""}`.trim()
                          : "Cliente sem nome"}
                      </h3>
                      <p>{selectedCustomer.email}</p>
                    </div>
                  </div>

                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>ID</label>
                      <span className="mono">{selectedCustomer.id}</span>
                    </div>
                    <div className="detail-item">
                      <label>Criado em</label>
                      <span>{formatDate(selectedCustomer.date_created)}</span>
                    </div>
                    {selectedCustomer.identification?.number && (
                      <div className="detail-item">
                        <label>{selectedCustomer.identification.type}</label>
                        <span>{selectedCustomer.identification.number}</span>
                      </div>
                    )}
                    {selectedCustomer.phone?.number && (
                      <div className="detail-item">
                        <label>Telefone</label>
                        <span>
                          ({selectedCustomer.phone.area_code}){" "}
                          {selectedCustomer.phone.number}
                        </span>
                      </div>
                    )}
                    {selectedCustomer.address?.street_name && (
                      <div className="detail-item full-width">
                        <label>Endereco</label>
                        <span>
                          {selectedCustomer.address.street_name},{" "}
                          {selectedCustomer.address.street_number}
                          {selectedCustomer.address.zip_code &&
                            ` - CEP: ${selectedCustomer.address.zip_code}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Cards */}
                  <div className="cards-section">
                    <h4>Cartoes Salvos ({customerCards.length})</h4>
                    {customerCards.length === 0 ? (
                      <p className="no-cards">Nenhum cartao cadastrado</p>
                    ) : (
                      <div className="cards-list">
                        {customerCards.map((card) => (
                          <div key={card.id} className="card-item">
                            <span className="material-icons">
                              {getCardBrandIcon(card.issuer?.name)}
                            </span>
                            <div className="card-info">
                              <span className="card-number">
                                **** **** **** {card.last_four_digits}
                              </span>
                              <span className="card-brand">
                                {card.issuer?.name || card.payment_method?.name}
                              </span>
                            </div>
                            <span className="card-expiry">
                              {card.expiration_month}/{card.expiration_year}
                            </span>
                            <button
                              className="btn-action delete"
                              title="Excluir cartao"
                              onClick={() =>
                                handleDeleteCard(selectedCustomer.id, card.id)
                              }
                              disabled={actionLoading}
                            >
                              <span className="material-icons">delete</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {(modalType === "create" || modalType === "edit") && (
                <form
                  onSubmit={
                    modalType === "create"
                      ? handleCreateCustomer
                      : handleUpdateCustomer
                  }
                >
                  <div className="form-section">
                    <h4>Informacoes Basicas</h4>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Email {modalType === "create" && "*"}</label>
                        <input
                          type="email"
                          value={customerForm.email}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              email: e.target.value,
                            })
                          }
                          placeholder="cliente@email.com"
                          required={modalType === "create"}
                          disabled={modalType === "edit"}
                        />
                      </div>
                      <div className="form-group">
                        <label>Nome</label>
                        <input
                          type="text"
                          value={customerForm.first_name}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              first_name: e.target.value,
                            })
                          }
                          placeholder="Nome"
                        />
                      </div>
                      <div className="form-group">
                        <label>Sobrenome</label>
                        <input
                          type="text"
                          value={customerForm.last_name}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              last_name: e.target.value,
                            })
                          }
                          placeholder="Sobrenome"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <h4>Documento</h4>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Tipo</label>
                        <select
                          value={customerForm.identification.type}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              identification: {
                                ...customerForm.identification,
                                type: e.target.value,
                              },
                            })
                          }
                        >
                          <option value="CPF">CPF</option>
                          <option value="CNPJ">CNPJ</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Numero</label>
                        <input
                          type="text"
                          value={customerForm.identification.number}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              identification: {
                                ...customerForm.identification,
                                number: e.target.value,
                              },
                            })
                          }
                          placeholder="000.000.000-00"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <h4>Telefone</h4>
                    <div className="form-grid">
                      <div className="form-group small">
                        <label>DDD</label>
                        <input
                          type="text"
                          value={customerForm.phone.area_code}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              phone: {
                                ...customerForm.phone,
                                area_code: e.target.value,
                              },
                            })
                          }
                          placeholder="11"
                          maxLength={2}
                        />
                      </div>
                      <div className="form-group">
                        <label>Numero</label>
                        <input
                          type="text"
                          value={customerForm.phone.number}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              phone: {
                                ...customerForm.phone,
                                number: e.target.value,
                              },
                            })
                          }
                          placeholder="99999-9999"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <h4>Endereco</h4>
                    <div className="form-grid">
                      <div className="form-group small">
                        <label>CEP</label>
                        <input
                          type="text"
                          value={customerForm.address.zip_code}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              address: {
                                ...customerForm.address,
                                zip_code: e.target.value,
                              },
                            })
                          }
                          placeholder="00000-000"
                        />
                      </div>
                      <div className="form-group">
                        <label>Rua</label>
                        <input
                          type="text"
                          value={customerForm.address.street_name}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              address: {
                                ...customerForm.address,
                                street_name: e.target.value,
                              },
                            })
                          }
                          placeholder="Nome da rua"
                        />
                      </div>
                      <div className="form-group small">
                        <label>Numero</label>
                        <input
                          type="text"
                          value={customerForm.address.street_number}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              address: {
                                ...customerForm.address,
                                street_number: e.target.value,
                              },
                            })
                          }
                          placeholder="123"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowModal(false)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={actionLoading}
                    >
                      {actionLoading
                        ? "Salvando..."
                        : modalType === "create"
                          ? "Criar Cliente"
                          : "Salvar Alteracoes"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {modalType === "view" && (
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Fechar
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => openEditModal(selectedCustomer)}
                >
                  <span className="material-icons">edit</span>
                  Editar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MPCustomers;
