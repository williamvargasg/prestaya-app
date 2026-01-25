import React, { useEffect, useState } from 'react'
import { getCurrentEmpresa, updateEmpresaConfig } from '../../services/empresaService'

const EmpresaConfigManager = () => {
  const [empresa, setEmpresa] = useState(null)
  const [form, setForm] = useState({
    nombre: '',
    dias_mora_para_multa: 3,
    monto_multa: 20000
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    const fetchEmpresa = async () => {
      setLoading(true)
      setError(null)
      try {
        const empresaData = await getCurrentEmpresa()
        if (!empresaData) {
          setError('No se encontró configuración de empresa para este usuario.')
          setEmpresa(null)
          return
        }
        setEmpresa(empresaData)
        setForm({
          nombre: empresaData.nombre || '',
          dias_mora_para_multa: empresaData.dias_mora_para_multa ?? 3,
          monto_multa: empresaData.monto_multa ?? 20000
        })
      } catch (err) {
        setError(err.message || 'Error cargando configuración de empresa')
      } finally {
        setLoading(false)
      }
    }

    fetchEmpresa()
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!empresa) return

    const dias = Number(form.dias_mora_para_multa)
    const monto = Number(form.monto_multa)

    if (!Number.isFinite(dias) || dias < 1) {
      setError('Los días de mora deben ser un número válido mayor a 0.')
      return
    }

    if (!Number.isFinite(monto) || monto < 0) {
      setError('El monto de la multa debe ser un número válido mayor o igual a 0.')
      return
    }

    const confirmar = window.confirm(
      'Esta configuración se bloqueará al guardar. ¿Deseas continuar?'
    )
    if (!confirmar) return

    setSaving(true)
    try {
      const updated = await updateEmpresaConfig(empresa.id, {
        nombre: form.nombre.trim() || empresa.nombre,
        dias_mora_para_multa: dias,
        monto_multa: monto,
        config_locked: true
      })
      setEmpresa(updated)
      setForm({
        nombre: updated.nombre,
        dias_mora_para_multa: updated.dias_mora_para_multa,
        monto_multa: updated.monto_multa
      })
      setSuccess('Configuración guardada y bloqueada correctamente.')
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la configuración.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div>Cargando configuración de empresa...</div>
  }

  if (!empresa) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#e74c3c' }}>
        {error || 'No hay datos de empresa disponibles.'}
      </div>
    )
  }

  const bloqueado = empresa.config_locked

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#f9fbfd',
      borderRadius: '12px',
      border: '1px solid #e1e5e9'
    }}>
      <h3 style={{ marginTop: 0, color: '#2c3e50' }}>🏢 Configuración de Empresa</h3>
      <p style={{ color: '#6c757d', marginBottom: '20px' }}>
        Define los parámetros de mora y multa antes de crear préstamos. Una vez guardados,
        quedan bloqueados para garantizar la consistencia.
      </p>

      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '10px 12px',
          borderRadius: '8px',
          marginBottom: '12px'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: '#d1e7dd',
          color: '#0f5132',
          padding: '10px 12px',
          borderRadius: '8px',
          marginBottom: '12px'
        }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
            Nombre de la empresa
          </label>
          <input
            type="text"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            disabled={bloqueado}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #ced4da',
              backgroundColor: bloqueado ? '#e9ecef' : '#ffffff'
            }}
          />
        </div>

        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
              Días de mora para multa
            </label>
            <input
              type="number"
              name="dias_mora_para_multa"
              value={form.dias_mora_para_multa}
              min="1"
              onChange={handleChange}
              disabled={bloqueado}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #ced4da',
                backgroundColor: bloqueado ? '#e9ecef' : '#ffffff'
              }}
            />
          </div>

          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
              Monto de multa (COP)
            </label>
            <input
              type="number"
              name="monto_multa"
              value={form.monto_multa}
              min="0"
              step="500"
              onChange={handleChange}
              disabled={bloqueado}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #ced4da',
                backgroundColor: bloqueado ? '#e9ecef' : '#ffffff'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={saving || bloqueado}
            style={{
              backgroundColor: bloqueado ? '#95a5a6' : '#2ecc71',
              color: 'white',
              padding: '10px 16px',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: bloqueado ? 'not-allowed' : 'pointer'
            }}
          >
            {bloqueado ? 'Configuración bloqueada' : (saving ? 'Guardando...' : 'Guardar y bloquear')}
          </button>

          {bloqueado && (
            <span style={{ color: '#27ae60', fontWeight: 'bold' }}>
              ✅ Configuración bloqueada desde {empresa.config_locked_at ? new Date(empresa.config_locked_at).toLocaleDateString() : 'inicio'}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}

export default EmpresaConfigManager
