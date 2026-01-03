import React, { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { 
  validarEmail, 
  validarTelefonoMovilColombia, 
  validarSoloNumeros 
} from '../../utils/validations'

const DeudoresManager = () => {
  const [deudores, setDeudores] = useState([])
  const [cobradores, setCobradores] = useState([])
  const [form, setForm] = useState({
    nombre: '',
    cedula: '',
    telefono: '',
    whatsapp: '',
    email: '',
    direccion_casa: '',
    barrio: '',
    direccion_trabajo: '',
    referencia_nombre: '',
    referencia_telefono: '',
    referencia_parentesco: '',
    cobrador_id: ''
  })
  const [editId, setEditId] = useState(null)
  const [errors, setErrors] = useState({})

  const opcionesParentesco = [
    'Espos@- Compañero@',
    'Padre-Madre',
    'Hij@',
    'Abuel@',
    'Prim@',
    'Sobrin@',
    'Novi@',
    'Amig@'
  ]

  const fetchDeudores = async () => {
    const { data, error } = await supabase
      .from('deudores')
      .select(`
        *,
        cobradores (nombre)
      `)
      .order('id', { ascending: true })
    if (error) console.error(error)
    else setDeudores(data)
  }

  const fetchCobradores = async () => {
    const { data, error } = await supabase
      .from('cobradores')
      .select('*')
      .eq('active', true)
      .order('nombre')
    if (error) console.error(error)
    else setCobradores(data)
  }

  useEffect(() => {
    fetchDeudores()
    fetchCobradores()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    
    // Limpiar error al escribir
    if (errors[name]) {
      setErrors({ ...errors, [name]: null })
    }
  }

  const validarFormulario = () => {
    const newErrors = {}
    
    if (!form.nombre) newErrors.nombre = 'Nombre es obligatorio'
    if (!form.cedula) newErrors.cedula = 'Cédula es obligatoria'
    if (!form.cobrador_id) newErrors.cobrador_id = 'Cobrador es obligatorio'
    
    if (form.telefono) {
      const errorTel = validarTelefonoMovilColombia(form.telefono)
      if (errorTel) newErrors.telefono = errorTel
    }
    
    if (form.whatsapp) {
      const errorWsp = validarTelefonoMovilColombia(form.whatsapp)
      if (errorWsp) newErrors.whatsapp = errorWsp
    }

    if (form.referencia_telefono) {
      const errorRefTel = validarTelefonoMovilColombia(form.referencia_telefono)
      if (errorRefTel) newErrors.referencia_telefono = errorRefTel
    }
    
    if (form.email) {
      const errorEmail = validarEmail(form.email)
      if (errorEmail) newErrors.email = errorEmail
    }
    
    if (form.cedula) {
      const errorCedula = validarSoloNumeros(form.cedula)
      if (errorCedula) {
        newErrors.cedula = errorCedula
      } else if (form.cedula.length > 10) {
        newErrors.cedula = 'La cédula no puede tener más de 10 dígitos'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const renderError = (field) => {
    if (errors[field]) {
      return <div style={{ color: '#dc3545', fontSize: '10px', marginTop: '2px' }}>{errors[field]}</div>
    }
    return null
  }

  const resetForm = () => {
    setForm({
      nombre: '',
      cedula: '',
      telefono: '',
      whatsapp: '',
      email: '',
      direccion_casa: '',
      barrio: '',
      direccion_trabajo: '',
      referencia_nombre: '',
      referencia_telefono: '',
      referencia_parentesco: '',
      cobrador_id: ''
    })
    setEditId(null)
    setErrors({})
  }

  const crearDeudor = async () => {
    if (!validarFormulario()) return
    
    // Validar cédula única
    const { data: existeCedula } = await supabase
      .from('deudores')
      .select('id')
      .eq('cedula', form.cedula)
      .maybeSingle()

    if (existeCedula) {
      setErrors(prev => ({ ...prev, cedula: 'Esta cédula ya está registrada' }))
      return
    }
    
    const { error } = await supabase.from('deudores').insert([form])
    if (error) console.error(error)
    else {
      resetForm()
      fetchDeudores()
    }
  }

  const iniciarEdicion = (d) => {
    setEditId(d.id)
    setForm({
      nombre: d.nombre,
      cedula: d.cedula,
      telefono: d.telefono || '',
      whatsapp: d.whatsapp,
      email: d.email || '',
      direccion_casa: d.direccion_casa || '',
      barrio: d.barrio || '',
      direccion_trabajo: d.direccion_trabajo || '',
      referencia_nombre: d.referencia_nombre || '',
      referencia_telefono: d.referencia_telefono || '',
      referencia_parentesco: d.referencia_parentesco || '',
      cobrador_id: d.cobrador_id || ''
    })
  }

  const guardarEdicion = async () => {
    if (!validarFormulario()) return

    // Validar cédula única
    const { data: existeCedula } = await supabase
      .from('deudores')
      .select('id')
      .eq('cedula', form.cedula)
      .neq('id', editId)
      .maybeSingle()

    if (existeCedula) {
      setErrors(prev => ({ ...prev, cedula: 'Esta cédula ya está registrada' }))
      return
    }

    const { error } = await supabase
      .from('deudores')
      .update(form)
      .eq('id', editId)
    if (error) console.error(error)
    else {
      resetForm()
      fetchDeudores()
    }
  }

  const borrarDeudor = async (id) => {
    if (!window.confirm('¿Eliminar este deudor?')) return
    const { error } = await supabase.from('deudores').delete().eq('id', id)
    if (error) console.error(error)
    else fetchDeudores()
  }

  return (
    <div>
      <h2>Gestión de Deudores</h2>

      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>{editId ? 'Editar Deudor' : 'Nuevo Deudor'}</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
          <div>
            <label style={{ fontSize: 'clamp(10px, 1.8vw, 12px)', color: '#666', display: 'block', marginBottom: '4px' }}>Nombre</label>
            <input
              type="text"
              name="nombre"
              placeholder="Nombre"
              value={form.nombre}
              onChange={handleChange}
              style={{ width: '100%', padding: 'clamp(6px, 1.5vw, 8px)', fontSize: 'clamp(12px, 2vw, 14px)', border: errors.nombre ? '1px solid #dc3545' : '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
            />
            {renderError('nombre')}
          </div>
          
          <div>
            <label style={{ fontSize: 'clamp(10px, 1.8vw, 12px)', color: '#666', display: 'block', marginBottom: '4px' }}>Cédula</label>
            <input
              type="text"
              name="cedula"
              placeholder="Cédula"
              value={form.cedula}
              onChange={handleChange}
              style={{ width: '100%', padding: 'clamp(6px, 1.5vw, 8px)', fontSize: 'clamp(12px, 2vw, 14px)', border: errors.cedula ? '1px solid #dc3545' : '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
            />
            {renderError('cedula')}
          </div>
          
          <div>
            <label style={{ fontSize: 'clamp(10px, 1.8vw, 12px)', color: '#666', display: 'block', marginBottom: '4px' }}>Teléfono</label>
            <input
              type="text"
              name="telefono"
              placeholder="Teléfono"
              value={form.telefono}
              onChange={handleChange}
              style={{ width: '100%', padding: 'clamp(6px, 1.5vw, 8px)', fontSize: 'clamp(12px, 2vw, 14px)', border: errors.telefono ? '1px solid #dc3545' : '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
            />
            {renderError('telefono')}
          </div>
          
          <div>
            <label style={{ fontSize: 'clamp(10px, 1.8vw, 12px)', color: '#666', display: 'block', marginBottom: '4px' }}>WhatsApp</label>
            <input
              type="text"
              name="whatsapp"
              placeholder="WhatsApp"
              value={form.whatsapp}
              onChange={handleChange}
              style={{ width: '100%', padding: 'clamp(6px, 1.5vw, 8px)', fontSize: 'clamp(12px, 2vw, 14px)', border: errors.whatsapp ? '1px solid #dc3545' : '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
            />
            {renderError('whatsapp')}
          </div>
          
          <div>
            <label style={{ fontSize: 'clamp(10px, 1.8vw, 12px)', color: '#666', display: 'block', marginBottom: '4px' }}>Email</label>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              style={{ width: '100%', padding: 'clamp(6px, 1.5vw, 8px)', fontSize: 'clamp(12px, 2vw, 14px)', border: errors.email ? '1px solid #dc3545' : '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
            />
            {renderError('email')}
          </div>
          
          <div>
            <label style={{ fontSize: 'clamp(10px, 1.8vw, 12px)', color: '#666', display: 'block', marginBottom: '4px' }}>Dirección Casa</label>
            <input
              type="text"
              name="direccion_casa"
              placeholder="Dirección Casa"
              value={form.direccion_casa}
              onChange={handleChange}
              style={{ width: '100%', padding: 'clamp(6px, 1.5vw, 8px)', fontSize: 'clamp(12px, 2vw, 14px)', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
            />
          </div>
          
          <div>
            <label style={{ fontSize: 'clamp(10px, 1.8vw, 12px)', color: '#666', display: 'block', marginBottom: '4px' }}>Barrio</label>
            <input
              type="text"
              name="barrio"
              placeholder="Barrio"
              value={form.barrio}
              onChange={handleChange}
              style={{ width: '100%', padding: 'clamp(6px, 1.5vw, 8px)', fontSize: 'clamp(12px, 2vw, 14px)', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
            />
          </div>
          
          <div>
            <label style={{ fontSize: 'clamp(10px, 1.8vw, 12px)', color: '#666', display: 'block', marginBottom: '4px' }}>Dirección Trabajo</label>
            <input
              type="text"
              name="direccion_trabajo"
              placeholder="Dirección Trabajo"
              value={form.direccion_trabajo}
              onChange={handleChange}
              style={{ width: '100%', padding: 'clamp(6px, 1.5vw, 8px)', fontSize: 'clamp(12px, 2vw, 14px)', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
            />
          </div>
          
          <div>
            <label style={{ fontSize: 'clamp(10px, 1.8vw, 12px)', color: '#666', display: 'block', marginBottom: '4px' }}>Referencia Nombre</label>
            <input
              type="text"
              name="referencia_nombre"
              placeholder="Referencia Nombre"
              value={form.referencia_nombre}
              onChange={handleChange}
              style={{ width: '100%', padding: 'clamp(6px, 1.5vw, 8px)', fontSize: 'clamp(12px, 2vw, 14px)', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
            />
          </div>
          
          <div>
            <label style={{ fontSize: 'clamp(10px, 1.8vw, 12px)', color: '#666', display: 'block', marginBottom: '4px' }}>Referencia Teléfono</label>
            <input
              type="text"
              name="referencia_telefono"
              placeholder="Referencia Teléfono"
              value={form.referencia_telefono}
              onChange={handleChange}
              style={{ width: '100%', padding: 'clamp(6px, 1.5vw, 8px)', fontSize: 'clamp(12px, 2vw, 14px)', border: errors.referencia_telefono ? '1px solid #dc3545' : '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
            />
            {renderError('referencia_telefono')}
          </div>
          
          <div>
            <label style={{ fontSize: 'clamp(10px, 1.8vw, 12px)', color: '#666', display: 'block', marginBottom: '4px' }}>Referencia Parentesco</label>
            <select
              name="referencia_parentesco"
              value={form.referencia_parentesco}
              onChange={handleChange}
              style={{ width: '100%', padding: 'clamp(6px, 1.5vw, 8px)', fontSize: 'clamp(12px, 2vw, 14px)', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
            >
              <option value="">Seleccionar parentesco</option>
              {opcionesParentesco.map(opcion => (
                <option key={opcion} value={opcion}>{opcion}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ fontSize: 'clamp(10px, 1.8vw, 12px)', color: '#666', display: 'block', marginBottom: '4px' }}>Asignar Cobrador</label>
            <select
              name="cobrador_id"
              value={form.cobrador_id}
              onChange={handleChange}
              style={{ width: '100%', padding: 'clamp(6px, 1.5vw, 8px)', fontSize: 'clamp(12px, 2vw, 14px)', border: errors.cobrador_id ? '1px solid #dc3545' : '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
            >
              <option value="">Asignar cobrador</option>
              {cobradores.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            {renderError('cobrador_id')}
          </div>
        </div>
        
        <div style={{ marginTop: '15px' }}>
          {editId ? (
            <>
              <button onClick={guardarEdicion} style={{ marginRight: '10px' }}>Guardar</button>
              <button onClick={resetForm}>Cancelar</button>
            </>
          ) : (
            <button onClick={crearDeudor}>Crear Deudor</button>
          )}
        </div>
      </div>

      <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Cédula</th>
            <th>WhatsApp</th>
            <th>Cobrador</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {deudores.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center' }}>No hay deudores.</td>
            </tr>
          ) : (
            deudores.map(d => (
              <tr key={d.id}>
                <td>{d.id}</td>
                <td>{d.nombre}</td>
                <td>{d.cedula}</td>
                <td>{d.whatsapp}</td>
                <td>{d.cobradores?.nombre || '—'}</td>
                <td>
                  <button onClick={() => iniciarEdicion(d)}>Editar</button>
                  <button onClick={() => borrarDeudor(d.id)}>Eliminar</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default DeudoresManager
