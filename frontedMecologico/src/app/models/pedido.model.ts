export interface LineaPedido {
  codProductoCatalogo: string;
  cantidadPedida: number;
}

export interface Pedido {
  id: string;
  codUsuario: string;
  catalogoId?: string;
  direccion?: string;
  estado: string;
  fecha: string;
  productos: {
    id: string;
    codProductoCatalogo: string;
    cantidadPedida: number;
    cantidadEntregada: number;
    pvp: number;
    nombreProducto: string;        
    precioUnitario: number;         
    subtotal: number; 
  }[];
  totalPedidoBase?: {
    total: number;
    base: number;
    iva: number;
  };
  totalPedido?: {
    total: number;
    base: number;
    iva: number;
  };
  totalEntrega?: {
    total: number;
    base: number;
    iva: number;
  };
}

export interface PedidoCompletoCreateDto {
  codUsuario: string;
  catalogoId: string;
  direccion: string;
  entrega: number;
  lineas: LineaPedido[];
}

export interface PedidoConCliente extends Pedido {
  nombreUsuario: string;
  direccionPedido: string;
}