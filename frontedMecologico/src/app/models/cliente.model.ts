
export interface Direccion {
  
  id: string;
  usuarioSub: string;
  direccion: string;
  codigoPostal?: string;
  municipio?: string;
  provincia?: string;
  esDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Cliente {
  
  sub: string;
  email: string;
  nombre: string;
  apellido?: string;
  telefono?: string;
  comentario?: string;
  rol: 'comprador' | 'administrador';
  state: 'Activo' | 'Baja';
  createdAt: string;
  updatedAt: string;
  direcciones?: Direccion[];
}

  