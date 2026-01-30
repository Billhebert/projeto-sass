import React, { useState, useEffect, useCallback } from 'react'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Filters from '../components/Filters'
import Form from '../components/Form'
import Toast from '../components/Toast'
import { feedbackAPI } from '../services/api'
import { handleAPIError } from '../services/api'
import './FeedbackList.css'

function FeedbackList() {
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0
  })

  const [showModal, setShowModal] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState(null)
  const [showReplyModal, setShowReplyModal] = useState(false)
  const [toast, setToast] = useState(null)

  const replyFormFields = [
    {
      name: 'reply',
      label: 'Sua Resposta',
      type: 'textarea',
      required: true,
      placeholder: 'Digite sua resposta ao feedback...',
      rows: 4,
      maxLength: 500
    }
  ]

   const fetchFeedback = useCallback(async (offset = 0, filters = {}) => {
     try {
       setLoading(true)
       setError(null)
       const response = await feedbackAPI.listFeedback({
         limit: pagination.limit,
         offset: offset,
         ...filters
       })
      
      const data = response.data.data || []
      const total = response.data.pagination?.total || 0
      
      setFeedback(Array.isArray(data) ? data : [])
      setPagination(prev => ({
        ...prev,
        offset: offset,
        total: total
      }))
    } catch (err) {
      const apiError = handleAPIError(err)
      setError(apiError.message)
      setToast({
        type: 'error',
        message: 'Erro ao carregar avaliações: ' + apiError.message
      })
    } finally {
      setLoading(false)
    }
  }, [pagination.limit])

  useEffect(() => {
    fetchFeedback(0)
  }, [])

  const handlePageChange = (newOffset) => {
    fetchFeedback(newOffset)
  }

  const handleSort = (column, direction) => {
    console.log('Sort:', column, direction)
  }

  const handleFilter = (filters) => {
    fetchFeedback(0, filters)
  }

  const handleViewDetails = (item) => {
    setSelectedFeedback(item)
    setShowModal(true)
  }

  const handleReplyClick = (item) => {
    setSelectedFeedback(item)
    setShowReplyModal(true)
  }

  const handleSubmitReply = async (values) => {
    try {
      setToast({
        type: 'success',
        message: 'Resposta enviada com sucesso!'
      })
      setShowReplyModal(false)
      fetchFeedback(pagination.offset)
    } catch (err) {
      const apiError = handleAPIError(err)
      setToast({
        type: 'error',
        message: 'Erro ao responder avaliação: ' + apiError.message
      })
    }
  }

  const getRatingStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating)
  }

  const columns = [
    {
      key: 'id',
      label: 'ID',
      width: '80px',
      render: (value) => value.substring(0, 8) + '...'
    },
    {
      key: 'rating',
      label: 'Avaliação',
      width: '120px',
      render: (value) => (
        <div className={`rating rating-${value}`}>
          {getRatingStars(value)}
        </div>
      )
    },
    {
      key: 'comment',
      label: 'Comentário',
      sortable: true,
      render: (value, row) => (
        <div className="feedback-cell">
          <div className="feedback-comment">{value || 'Sem comentário'}</div>
          <small className="feedback-from">por {row.from_user_name}</small>
        </div>
      )
    },
    {
      key: 'type',
      label: 'Tipo',
      width: '100px',
      render: (value) => (
        <span className={`type type-${value?.toLowerCase()}`}>
          {value === 'positive' ? 'Positiva' : value === 'negative' ? 'Negativa' : 'Neutra'}
        </span>
      )
    },
    {
      key: 'has_reply',
      label: 'Resposta',
      width: '100px',
      render: (value) => value ? <span className="replied">✓ Respondida</span> : <span className="not-replied">Pendente</span>
    },
    {
      key: 'created_at',
      label: 'Data',
      width: '130px',
      render: (value) => new Date(value).toLocaleDateString('pt-BR')
    }
  ]

  const positiveFeedback = feedback.filter(f => f.type === 'positive').length
  const negativeFeedback = feedback.filter(f => f.type === 'negative').length
  const avgRating = feedback.length > 0 
    ? (feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.length).toFixed(1)
    : 0

  return (
    <div className="feedback-list-container">
      <div className="feedback-header">
        <h1>Avaliações de Clientes</h1>
        <div className="feedback-stats">
          <div className="stat-card">
            <div className="stat-value">{avgRating}</div>
            <div className="stat-label">Avaliação Média</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{positiveFeedback}</div>
            <div className="stat-label">Positivas</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{negativeFeedback}</div>
            <div className="stat-label">Negativas</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{feedback.length}</div>
            <div className="stat-label">Total</div>
          </div>
        </div>
      </div>

      <Filters
        filters={[
          { name: 'search', label: 'Buscar Avaliação', type: 'text', placeholder: 'Comentário...' },
          { name: 'rating', label: 'Classificação', type: 'select', options: [
            { value: '5', label: '5 estrelas' },
            { value: '4', label: '4 estrelas' },
            { value: '3', label: '3 estrelas' },
            { value: '2', label: '2 estrelas' },
            { value: '1', label: '1 estrela' }
          ]},
          { name: 'type', label: 'Tipo', type: 'select', options: [
            { value: 'positive', label: 'Positiva' },
            { value: 'negative', label: 'Negativa' },
            { value: 'neutral', label: 'Neutra' }
          ]}
        ]}
        onApply={handleFilter}
        onReset={() => fetchFeedback(0)}
        loading={loading}
      />

      <DataTable
        data={feedback}
        columns={columns}
        loading={loading}
        error={error}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSort={handleSort}
        onRowClick={handleViewDetails}
        onEdit={handleReplyClick}
        selectable={true}
        striped={true}
        hoverable={true}
      />

      {selectedFeedback && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Detalhes da Avaliação"
          size="medium"
        >
          <div className="feedback-details">
            <div className="detail-section">
              <h3>Avaliação</h3>
              <div className={`rating rating-${selectedFeedback.rating}`}>
                {getRatingStars(selectedFeedback.rating)}
              </div>
            </div>
            <div className="detail-section">
              <h3>Comentário</h3>
              <p>{selectedFeedback.comment || 'Sem comentário'}</p>
            </div>
            <div className="detail-section">
              <h3>De:</h3>
              <p>{selectedFeedback.from_user_name}</p>
            </div>
            {selectedFeedback.reply && (
              <div className="detail-section">
                <h3>Sua Resposta</h3>
                <p>{selectedFeedback.reply}</p>
              </div>
            )}
            <button className="btn btn-primary" onClick={() => {
              setShowModal(false)
              handleReplyClick(selectedFeedback)
            }}>
              {selectedFeedback.reply ? 'Editar Resposta' : 'Responder'}
            </button>
          </div>
        </Modal>
      )}

      {selectedFeedback && (
        <Modal
          isOpen={showReplyModal}
          onClose={() => setShowReplyModal(false)}
          title="Responder Avaliação"
          size="medium"
          footer={null}
        >
          <Form
            fields={replyFormFields}
            initialValues={{ reply: selectedFeedback.reply || '' }}
            onSubmit={handleSubmitReply}
            onCancel={() => setShowReplyModal(false)}
            loading={loading}
            submitLabel="Responder"
          />
        </Modal>
      )}

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default FeedbackList
