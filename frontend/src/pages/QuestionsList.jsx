import React, { useState, useEffect, useCallback } from 'react'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Filters from '../components/Filters'
import Form from '../components/Form'
import Toast from '../components/Toast'
import { questionsAPI } from '../services/api'
import { handleAPIError } from '../services/api'
import './QuestionsList.css'

function QuestionsList() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0
  })

  const [showModal, setShowModal] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [showAnswerModal, setShowAnswerModal] = useState(false)
  const [toast, setToast] = useState(null)

  const answerFormFields = [
    {
      name: 'answer',
      label: 'Sua Resposta',
      type: 'textarea',
      required: true,
      placeholder: 'Digite sua resposta aqui...',
      rows: 5,
      maxLength: 1000
    }
  ]

   const fetchQuestions = useCallback(async (offset = 0, filters = {}) => {
     try {
       setLoading(true)
       setError(null)
       const response = await questionsAPI.listQuestions({
         limit: pagination.limit,
         offset: offset,
         ...filters
       })
      
      const data = response.data.data || []
      const total = response.data.pagination?.total || 0
      
      setQuestions(Array.isArray(data) ? data : [])
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
        message: 'Erro ao carregar perguntas: ' + apiError.message
      })
    } finally {
      setLoading(false)
    }
  }, [pagination.limit])

  useEffect(() => {
    fetchQuestions(0)
  }, [])

  const handlePageChange = (newOffset) => {
    fetchQuestions(newOffset)
  }

  const handleSort = (column, direction) => {
    console.log('Sort:', column, direction)
  }

  const handleFilter = (filters) => {
    fetchQuestions(0, filters)
  }

  const handleViewDetails = (question) => {
    setSelectedQuestion(question)
    setShowModal(true)
  }

  const handleAnswerClick = (question) => {
    setSelectedQuestion(question)
    setShowAnswerModal(true)
  }

  const handleSubmitAnswer = async (values) => {
    try {
      await questionsAPI.answerQuestion(selectedQuestion.id, values)
      setToast({
        type: 'success',
        message: 'Resposta enviada com sucesso!'
      })
      setShowAnswerModal(false)
      fetchQuestions(pagination.offset)
    } catch (err) {
      const apiError = handleAPIError(err)
      setToast({
        type: 'error',
        message: 'Erro ao responder pergunta: ' + apiError.message
      })
    }
  }

  const handleDelete = async (question) => {
    try {
      await questionsAPI.deleteQuestion(question.id)
      setToast({
        type: 'success',
        message: 'Pergunta deletada com sucesso!'
      })
      fetchQuestions(pagination.offset)
    } catch (err) {
      const apiError = handleAPIError(err)
      setToast({
        type: 'error',
        message: 'Erro ao deletar pergunta: ' + apiError.message
      })
    }
  }

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendente',
      answered: 'Respondida',
      closed: 'Fechada'
    }
    return labels[status] || status
  }

  const columns = [
    {
      key: 'id',
      label: 'ID',
      width: '80px',
      render: (value) => value.substring(0, 8) + '...'
    },
    {
      key: 'question_text',
      label: 'Pergunta',
      sortable: true,
      render: (value, row) => (
        <div className="question-cell">
          <div className="question-title">{value}</div>
          <small className="question-from">por {row.from_user_name}</small>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      render: (value) => (
        <span className={`status status-${value?.toLowerCase()}`}>
          {getStatusLabel(value)}
        </span>
      )
    },
    {
      key: 'answer_text',
      label: 'Resposta',
      width: '150px',
      render: (value) => value ? <span className="has-answer">✓ Respondida</span> : <span className="no-answer">Aguardando</span>
    },
    {
      key: 'created_at',
      label: 'Data',
      width: '130px',
      render: (value) => new Date(value).toLocaleDateString('pt-BR')
    }
  ]

  return (
    <div className="questions-list-container">
      <div className="questions-header">
        <h1>Perguntas e Respostas</h1>
        <div className="questions-stats">
          <div className="stat-card">
            <div className="stat-value">{questions.filter(q => !q.answer_text).length}</div>
            <div className="stat-label">Pendentes</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{questions.filter(q => q.answer_text).length}</div>
            <div className="stat-label">Respondidas</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{questions.length}</div>
            <div className="stat-label">Total</div>
          </div>
        </div>
      </div>

      <Filters
        filters={[
          { name: 'search', label: 'Buscar Pergunta', type: 'text', placeholder: 'Texto da pergunta...' },
          { name: 'status', label: 'Status', type: 'select', options: [
            { value: 'pending', label: 'Pendente' },
            { value: 'answered', label: 'Respondida' }
          ]}
        ]}
        onApply={handleFilter}
        onReset={() => fetchQuestions(0)}
        loading={loading}
      />

      <DataTable
        data={questions}
        columns={columns}
        loading={loading}
        error={error}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSort={handleSort}
        onRowClick={handleViewDetails}
        onEdit={handleAnswerClick}
        onDelete={handleDelete}
        selectable={true}
        striped={true}
        hoverable={true}
      />

      {selectedQuestion && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Detalhes da Pergunta"
          size="medium"
        >
          <div className="question-details">
            <div className="detail-section">
              <h3>Pergunta</h3>
              <p>{selectedQuestion.question_text}</p>
            </div>
            <div className="detail-section">
              <h3>De:</h3>
              <p>{selectedQuestion.from_user_name}</p>
            </div>
            {selectedQuestion.answer_text && (
              <div className="detail-section">
                <h3>Resposta</h3>
                <p>{selectedQuestion.answer_text}</p>
              </div>
            )}
            <button className="btn btn-primary" onClick={() => {
              setShowModal(false)
              handleAnswerClick(selectedQuestion)
            }}>
              {selectedQuestion.answer_text ? 'Editar Resposta' : 'Responder'}
            </button>
          </div>
        </Modal>
      )}

      {selectedQuestion && (
        <Modal
          isOpen={showAnswerModal}
          onClose={() => setShowAnswerModal(false)}
          title="Responder Pergunta"
          size="medium"
          footer={null}
        >
          <Form
            fields={answerFormFields}
            initialValues={{ answer: selectedQuestion.answer_text || '' }}
            onSubmit={handleSubmitAnswer}
            onCancel={() => setShowAnswerModal(false)}
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

export default QuestionsList
