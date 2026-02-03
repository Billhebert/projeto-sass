import { useState } from 'react'
import { Link } from 'react-router-dom'
import { mpPreferencesAPI, formatMPCurrency } from '../services/mercadopago'
import { useToastStore } from '../store/toastStore'
import './MPCheckout.css'

function MPCheckout() {
  const [loading, setLoading] = useState(false)
  const [checkoutType, setCheckoutType] = useState('product') // 'product' or 'cart'
  const [checkoutResult, setCheckoutResult] = useState(null)
  const { showToast } = useToastStore()

  // Product form
  const [productForm, setProductForm] = useState({
    title: '',
    description: '',
    price: '',
    quantity: 1,
    picture_url: '',
    payer_email: '',
    payer_name: '',
    external_reference: '',
  })

  // Cart items
  const [cartItems, setCartItems] = useState([
    { id: '1', title: '', price: '', quantity: 1 },
  ])
  const [cartPayer, setCartPayer] = useState({ email: '', name: '' })

  const handleProductChange = (e) => {
    const { name, value } = e.target
    setProductForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleCartItemChange = (index, field, value) => {
    setCartItems((prev) => {
      const newItems = [...prev]
      newItems[index] = { ...newItems[index], [field]: value }
      return newItems
    })
  }

  const addCartItem = () => {
    setCartItems((prev) => [
      ...prev,
      { id: `${prev.length + 1}`, title: '', price: '', quantity: 1 },
    ])
  }

  const removeCartItem = (index) => {
    if (cartItems.length > 1) {
      setCartItems((prev) => prev.filter((_, i) => i !== index))
    }
  }

  const calculateCartTotal = () => {
    return cartItems.reduce((acc, item) => {
      return acc + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0)
    }, 0)
  }

  const handleCreateProductCheckout = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await mpPreferencesAPI.createProduct({
        title: productForm.title,
        description: productForm.description,
        price: parseFloat(productForm.price),
        quantity: parseInt(productForm.quantity),
        picture_url: productForm.picture_url || undefined,
        payer_email: productForm.payer_email || undefined,
        payer_name: productForm.payer_name || undefined,
        external_reference: productForm.external_reference || `order_${Date.now()}`,
      })

      setCheckoutResult(response.data)
      showToast('Checkout criado com sucesso!', 'success')
    } catch (error) {
      console.error('Error creating checkout:', error)
      showToast('Erro ao criar checkout', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCartCheckout = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const items = cartItems.map((item) => ({
        id: item.id,
        title: item.title,
        unit_price: parseFloat(item.price),
        quantity: parseInt(item.quantity),
      }))

      const response = await mpPreferencesAPI.createCart({
        items,
        payer: {
          email: cartPayer.email || undefined,
          name: cartPayer.name || undefined,
        },
        external_reference: `cart_${Date.now()}`,
      })

      setCheckoutResult(response.data)
      showToast('Checkout criado com sucesso!', 'success')
    } catch (error) {
      console.error('Error creating cart checkout:', error)
      showToast('Erro ao criar checkout', 'error')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setCheckoutResult(null)
    setProductForm({
      title: '',
      description: '',
      price: '',
      quantity: 1,
      picture_url: '',
      payer_email: '',
      payer_name: '',
      external_reference: '',
    })
    setCartItems([{ id: '1', title: '', price: '', quantity: 1 }])
    setCartPayer({ email: '', name: '' })
  }

  return (
    <div className="mp-checkout">
      <header className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">shopping_cart_checkout</span>
            Criar Checkout
          </h1>
          <p>Crie um link de pagamento do Mercado Pago</p>
        </div>
        <div className="header-actions">
          <Link to="/mp" className="btn btn-secondary">
            <span className="material-icons">arrow_back</span>
            Voltar
          </Link>
        </div>
      </header>

      {checkoutResult ? (
        <div className="checkout-result">
          <div className="result-card success">
            <div className="result-icon">
              <span className="material-icons">check_circle</span>
            </div>
            <h2>Checkout Criado com Sucesso!</h2>
            <p>Compartilhe o link abaixo para receber o pagamento</p>

            <div className="result-details">
              <div className="detail-item">
                <label>ID da Preferencia</label>
                <span className="mono">{checkoutResult.preferenceId}</span>
              </div>

              <div className="detail-item">
                <label>Valor Total</label>
                <span className="amount">{formatMPCurrency(checkoutResult.totalAmount)}</span>
              </div>

              <div className="detail-item full-width">
                <label>Link de Pagamento (Producao)</label>
                <div className="link-box">
                  <input type="text" value={checkoutResult.checkoutUrl} readOnly />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(checkoutResult.checkoutUrl)
                      showToast('Link copiado!', 'success')
                    }}
                  >
                    <span className="material-icons">content_copy</span>
                  </button>
                </div>
              </div>

              <div className="detail-item full-width">
                <label>Link de Pagamento (Sandbox/Teste)</label>
                <div className="link-box">
                  <input type="text" value={checkoutResult.sandboxUrl} readOnly />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(checkoutResult.sandboxUrl)
                      showToast('Link copiado!', 'success')
                    }}
                  >
                    <span className="material-icons">content_copy</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="result-actions">
              <a
                href={checkoutResult.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                <span className="material-icons">open_in_new</span>
                Abrir Checkout
              </a>
              <button className="btn btn-secondary" onClick={resetForm}>
                <span className="material-icons">add</span>
                Criar Novo
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Checkout Type Selector */}
          <div className="type-selector">
            <button
              className={`type-btn ${checkoutType === 'product' ? 'active' : ''}`}
              onClick={() => setCheckoutType('product')}
            >
              <span className="material-icons">inventory_2</span>
              Produto Unico
            </button>
            <button
              className={`type-btn ${checkoutType === 'cart' ? 'active' : ''}`}
              onClick={() => setCheckoutType('cart')}
            >
              <span className="material-icons">shopping_cart</span>
              Carrinho
            </button>
          </div>

          {/* Product Form */}
          {checkoutType === 'product' && (
            <form className="checkout-form" onSubmit={handleCreateProductCheckout}>
              <div className="form-section">
                <h3>Informacoes do Produto</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Titulo *</label>
                    <input
                      type="text"
                      name="title"
                      value={productForm.title}
                      onChange={handleProductChange}
                      placeholder="Ex: Camiseta Estampada"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Preco (R$) *</label>
                    <input
                      type="number"
                      name="price"
                      value={productForm.price}
                      onChange={handleProductChange}
                      placeholder="99.90"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Quantidade *</label>
                    <input
                      type="number"
                      name="quantity"
                      value={productForm.quantity}
                      onChange={handleProductChange}
                      min="1"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>URL da Imagem</label>
                    <input
                      type="url"
                      name="picture_url"
                      value={productForm.picture_url}
                      onChange={handleProductChange}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Descricao</label>
                    <textarea
                      name="description"
                      value={productForm.description}
                      onChange={handleProductChange}
                      placeholder="Descricao do produto"
                      rows="3"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Informacoes do Comprador (Opcional)</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="payer_email"
                      value={productForm.payer_email}
                      onChange={handleProductChange}
                      placeholder="cliente@email.com"
                    />
                  </div>

                  <div className="form-group">
                    <label>Nome</label>
                    <input
                      type="text"
                      name="payer_name"
                      value={productForm.payer_name}
                      onChange={handleProductChange}
                      placeholder="Nome do cliente"
                    />
                  </div>

                  <div className="form-group">
                    <label>Referencia Externa</label>
                    <input
                      type="text"
                      name="external_reference"
                      value={productForm.external_reference}
                      onChange={handleProductChange}
                      placeholder="ID do pedido no seu sistema"
                    />
                  </div>
                </div>
              </div>

              <div className="form-footer">
                <div className="total-preview">
                  <span>Total:</span>
                  <span className="total-amount">
                    {formatMPCurrency(
                      (parseFloat(productForm.price) || 0) * (parseInt(productForm.quantity) || 0)
                    )}
                  </span>
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="spinner-small"></div>
                      Criando...
                    </>
                  ) : (
                    <>
                      <span className="material-icons">link</span>
                      Gerar Link de Pagamento
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Cart Form */}
          {checkoutType === 'cart' && (
            <form className="checkout-form" onSubmit={handleCreateCartCheckout}>
              <div className="form-section">
                <h3>Itens do Carrinho</h3>
                <div className="cart-items">
                  {cartItems.map((item, index) => (
                    <div key={index} className="cart-item">
                      <div className="item-number">{index + 1}</div>
                      <div className="item-fields">
                        <input
                          type="text"
                          placeholder="Nome do item"
                          value={item.title}
                          onChange={(e) => handleCartItemChange(index, 'title', e.target.value)}
                          required
                        />
                        <input
                          type="number"
                          placeholder="Preco"
                          step="0.01"
                          min="0"
                          value={item.price}
                          onChange={(e) => handleCartItemChange(index, 'price', e.target.value)}
                          required
                        />
                        <input
                          type="number"
                          placeholder="Qtd"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleCartItemChange(index, 'quantity', e.target.value)}
                          required
                        />
                      </div>
                      <button
                        type="button"
                        className="remove-item"
                        onClick={() => removeCartItem(index)}
                        disabled={cartItems.length === 1}
                      >
                        <span className="material-icons">close</span>
                      </button>
                    </div>
                  ))}
                  <button type="button" className="add-item-btn" onClick={addCartItem}>
                    <span className="material-icons">add</span>
                    Adicionar Item
                  </button>
                </div>
              </div>

              <div className="form-section">
                <h3>Informacoes do Comprador (Opcional)</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={cartPayer.email}
                      onChange={(e) => setCartPayer((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="cliente@email.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Nome</label>
                    <input
                      type="text"
                      value={cartPayer.name}
                      onChange={(e) => setCartPayer((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Nome do cliente"
                    />
                  </div>
                </div>
              </div>

              <div className="form-footer">
                <div className="total-preview">
                  <span>Total ({cartItems.length} itens):</span>
                  <span className="total-amount">{formatMPCurrency(calculateCartTotal())}</span>
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="spinner-small"></div>
                      Criando...
                    </>
                  ) : (
                    <>
                      <span className="material-icons">link</span>
                      Gerar Link de Pagamento
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  )
}

export default MPCheckout
