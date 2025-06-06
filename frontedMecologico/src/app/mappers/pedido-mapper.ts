
import { Pedido } from '../models/pedido.model';
import { Cliente, Direccion } from '../models/cliente.model';
import { PedidoConCliente } from '../models/pedido.model';

export class PedidoMapper {
  static mapToPedidoConCliente(
  pedido: Pedido,
  cliente: Cliente,
  direcciones: Direccion[]
): PedidoConCliente {
  let direccionLegible: string;

  if (pedido.direccion === 'RECOGER_EN_TIENDA') {
    direccionLegible = 'RECOGER_EN_TIENDA';
  } else {
    const dir = direcciones.find(d => d.id === pedido.direccion);
    direccionLegible = dir
      ? `${dir.direccion}${dir.municipio ? ', ' + dir.municipio : ''}${dir.provincia ? ', ' + dir.provincia : ''}${dir.codigoPostal ? ' (' + dir.codigoPostal + ')' : ''}`
      : '—desconocida—';
  }

  return {
    ...pedido,
    nombreUsuario: cliente.nombre,
    direccionPedido: direccionLegible
  };
}

}
