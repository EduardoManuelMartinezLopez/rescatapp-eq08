// Textos del formulario según el rol que elige la persona (negocio donante u organización receptora)
export const TEXTO_ROL = {
  donante: {
    nombre: 'Nombre del negocio', placeholder: 'Ej. Panadería San Martín',
    telefono: 'Teléfono del negocio', ayudaTelefono: 'Solo se comparte con la organización que aparte tu donación.',
    direccion: 'Dirección del negocio', ayudaDireccion: 'Aquí se recogerán tus donaciones. Elige una sugerencia de la lista o toca el mapa para confirmar que el lugar existe.',
    aviso: '',
  },
  receptor: {
    nombre: 'Nombre de la organización', placeholder: 'Ej. Comedor Comunitario Esperanza',
    telefono: 'Teléfono de contacto', ayudaTelefono: 'Solo se comparte con el negocio cuya donación apartes.',
    direccion: 'Dirección de la organización', ayudaDireccion: 'Es el lugar donde recibes y atiendes a las personas. Elige una sugerencia de la lista o toca el mapa para confirmar que existe.',
    aviso: 'Un administrador revisará tu organización antes de que puedas apartar alimentos. Mientras tanto podrás ver las donaciones.',
  },
};
