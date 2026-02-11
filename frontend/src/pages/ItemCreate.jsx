import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useMLAccounts,
  useListingTypes,
  useSearchCategories,
  usePredictCategoryMutation,
  useCategoryAttributes,
  useCreateItem,
} from "../hooks/useApi";
import "./ItemCreate.css";

function ItemCreate() {
  const navigate = useNavigate();

  // React Query hooks
  const { data: accounts = [], isLoading: accountsLoading } = useMLAccounts();
  const { data: listingTypes = [], isLoading: listingTypesLoading } =
    useListingTypes();
  const createItemMutation = useCreateItem();
  const predictCategoryMutation = usePredictCategoryMutation();

  // State
  const [selectedAccount, setSelectedAccount] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchCategory, setSearchCategory] = useState("");
  const [predictedCategory, setPredictedCategory] = useState(null);

  // Fetch categories based on search
  const { data: categories = [], refetch: searchCategories } =
    useSearchCategories(searchCategory);

  // Fetch category attributes
  const { data: categoryAttributes = [] } = useCategoryAttributes(
    selectedCategory?.id || formData.categoryId,
  );

  const [formData, setFormData] = useState({
    title: "",
    categoryId: "",
    price: "",
    currencyId: "BRL",
    availableQuantity: 1,
    buyingMode: "buy_it_now",
    condition: "new",
    listingTypeId: "gold_special",
    description: "",
    pictures: [],
    attributes: {},
  });

  // Set first account as selected when accounts load
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts, selectedAccount]);

  // Predict category when title changes
  useEffect(() => {
    if (formData.title.length > 10 && !formData.categoryId) {
      const timeoutId = setTimeout(() => {
        predictCategoryMutation.mutate(formData.title, {
          onSuccess: (category) => {
            setPredictedCategory(category);
          },
          onError: (err) => {
            console.error("Erro ao prever categoria:", err);
          },
        });
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [formData.title, formData.categoryId]);

  const selectCategory = (category) => {
    setSelectedCategory(category);
    setFormData((prev) => ({ ...prev, categoryId: category.id }));
    setSearchCategory("");
    setPredictedCategory(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAttributeChange = (attrId, value) => {
    setFormData((prev) => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [attrId]: value,
      },
    }));
  };

  const handlePictureAdd = () => {
    const url = prompt("URL da imagem:");
    if (url) {
      setFormData((prev) => ({
        ...prev,
        pictures: [...prev.pictures, { source: url }],
      }));
    }
  };

  const handlePictureRemove = (index) => {
    setFormData((prev) => ({
      ...prev,
      pictures: prev.pictures.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedAccount) {
      setError("Selecione uma conta");
      return;
    }

    if (!formData.categoryId) {
      setError("Selecione uma categoria");
      return;
    }

    if (formData.pictures.length === 0) {
      setError("Adicione pelo menos uma imagem");
      return;
    }

    setError(null);

    const itemData = {
      title: formData.title,
      category_id: formData.categoryId,
      price: parseFloat(formData.price),
      currency_id: formData.currencyId,
      available_quantity: parseInt(formData.availableQuantity),
      buying_mode: formData.buyingMode,
      condition: formData.condition,
      listing_type_id: formData.listingTypeId,
      description: { plain_text: formData.description },
      pictures: formData.pictures,
      attributes: Object.entries(formData.attributes).map(([id, value]) => ({
        id,
        value_name: value,
      })),
    };

    createItemMutation.mutate(
      { accountId: selectedAccount, itemData },
      {
        onSuccess: () => {
          setSuccess("Anuncio criado com sucesso!");
          setTimeout(() => {
            navigate("/items");
          }, 2000);
        },
        onError: (err) => {
          setError(err.response?.data?.error || "Erro ao criar anuncio");
        },
      },
    );
  };

  const isLoading =
    accountsLoading || listingTypesLoading || createItemMutation.isPending;

  return (
    <div className="item-create-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">add_box</span>
            Criar Anuncio
          </h1>
          <p>Publique um novo produto no Mercado Livre</p>
        </div>
        <div className="header-actions">
          <select
            className="account-select"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            disabled={accountsLoading}
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.nickname || acc.mlUserId}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <span className="material-icons">error</span>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span className="material-icons">check_circle</span>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="item-form">
        <div className="form-section">
          <h2>
            <span className="material-icons">info</span>
            Informacoes Basicas
          </h2>

          <div className="form-group">
            <label>Titulo do Anuncio *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Ex: Smartphone Samsung Galaxy S21 128GB"
              maxLength={60}
              required
            />
            <span className="char-count">{formData.title.length}/60</span>
          </div>

          {predictedCategory && !formData.categoryId && (
            <div className="predicted-category">
              <span className="material-icons">lightbulb</span>
              <span>Categoria sugerida: </span>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => selectCategory(predictedCategory)}
              >
                {predictedCategory.name}
              </button>
            </div>
          )}

          <div className="form-group">
            <label>Categoria *</label>
            {selectedCategory ? (
              <div className="selected-category">
                <span>{selectedCategory.name}</span>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => {
                    setSelectedCategory(null);
                    setFormData((prev) => ({ ...prev, categoryId: "" }));
                  }}
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
            ) : (
              <div className="category-search">
                <input
                  type="text"
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  placeholder="Buscar categoria..."
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    (e.preventDefault(), searchCategories())
                  }
                />
                <button
                  type="button"
                  onClick={() => searchCategories()}
                  className="btn btn-secondary"
                >
                  <span className="material-icons">search</span>
                </button>
              </div>
            )}
            {categories.length > 0 && (
              <div className="category-results">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className="category-item"
                    onClick={() => selectCategory(cat)}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Preco *</label>
              <div className="input-with-prefix">
                <span className="prefix">R$</span>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="0,00"
                  step="0.01"
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Quantidade *</label>
              <input
                type="number"
                name="availableQuantity"
                value={formData.availableQuantity}
                onChange={handleInputChange}
                min="1"
                required
              />
            </div>

            <div className="form-group">
              <label>Condicao *</label>
              <select
                name="condition"
                value={formData.condition}
                onChange={handleInputChange}
              >
                <option value="new">Novo</option>
                <option value="used">Usado</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Tipo de Listagem</label>
            <select
              name="listingTypeId"
              value={formData.listingTypeId}
              onChange={handleInputChange}
              disabled={listingTypesLoading}
            >
              {listingTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-section">
          <h2>
            <span className="material-icons">image</span>
            Imagens
          </h2>

          <div className="pictures-grid">
            {formData.pictures.map((pic, index) => (
              <div key={index} className="picture-item">
                <img src={pic.source} alt={`Imagem ${index + 1}`} />
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => handlePictureRemove(index)}
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
            ))}
            <button
              type="button"
              className="picture-add"
              onClick={handlePictureAdd}
            >
              <span className="material-icons">add_photo_alternate</span>
              <span>Adicionar Imagem</span>
            </button>
          </div>
          <p className="form-help">
            Adicione URLs de imagens do produto (minimo 1)
          </p>
        </div>

        <div className="form-section">
          <h2>
            <span className="material-icons">description</span>
            Descricao
          </h2>

          <div className="form-group">
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Descreva seu produto em detalhes..."
              rows={6}
            />
          </div>
        </div>

        {categoryAttributes.length > 0 && (
          <div className="form-section">
            <h2>
              <span className="material-icons">tune</span>
              Atributos da Categoria
            </h2>

            <div className="attributes-grid">
              {categoryAttributes
                .filter((attr) => attr.tags?.required)
                .map((attr) => (
                  <div key={attr.id} className="form-group">
                    <label>
                      {attr.name}
                      {attr.tags?.required && (
                        <span className="required">*</span>
                      )}
                    </label>
                    {attr.values?.length > 0 ? (
                      <select
                        value={formData.attributes[attr.id] || ""}
                        onChange={(e) =>
                          handleAttributeChange(attr.id, e.target.value)
                        }
                      >
                        <option value="">Selecione...</option>
                        {attr.values.map((val) => (
                          <option key={val.id} value={val.name}>
                            {val.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={formData.attributes[attr.id] || ""}
                        onChange={(e) =>
                          handleAttributeChange(attr.id, e.target.value)
                        }
                        placeholder={attr.hint || ""}
                      />
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/items")}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="spinner small"></div>
                Publicando...
              </>
            ) : (
              <>
                <span className="material-icons">publish</span>
                Publicar Anuncio
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ItemCreate;
