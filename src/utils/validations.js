export const validarEmail = (email) => {
  if (!email) return null
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) ? null : 'Email inválido'
}

export const validarTelefonoMovilColombia = (telefono) => {
  if (!telefono) return null
  // Teléfonos móviles de Colombia: 10 dígitos, empiezan con 3
  const telefonoRegex = /^3\d{9}$/
  return telefonoRegex.test(telefono) ? null : 'Teléfono móvil debe tener 10 dígitos y empezar con 3'
}

export const validarSoloNumeros = (valor) => {
  if (!valor) return null
  const numeroRegex = /^\d+$/
  return numeroRegex.test(valor) ? null : 'Solo se permiten números'
}

export const validarAlfanumerico = (valor) => {
  if (!valor) return null
  const alfanumericoRegex = /^[a-zA-Z0-9\s]+$/
  return alfanumericoRegex.test(valor) ? null : 'Solo se permiten letras, números y espacios'
}
