import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Pedido, LineaPedido, PedidoConCliente } from '../../models/pedido.model';
import { ClienteService } from '../../services/cliente.service';
import { DireccionService } from '../../services/direccion.service';
import { Cliente, Direccion } from '../../models/cliente.model';
import { CatalogoService } from '../../services/catalogo.service';
import { CarritoService } from '../../services/carrito.service';
import { Router } from '@angular/router';
import { PedidoService } from '../../services/pedido.service';
import { AuthService } from '../../services/auth.service';
import { PedidoMapper } from '../../mappers/pedido-mapper';


@Component({
  selector: 'app-pedidos-pendientes',
  templateUrl: './pedidos-pendientes.component.html',
  styleUrls: ['./pedidos-pendientes.component.css'],
  standalone: false
})
export class PedidosPendientesComponent implements OnInit, OnDestroy {
  pedidos: PedidoConCliente[] = [];
  loading = false;
  esAdmin = false;
  error = '';
  private sub!: Subscription;
  isAddressVisible: Record<string, boolean> = {};
  isProductosVisible: Record<string, boolean> = {};
  unidadVentaPorProducto: Record<string, string> = {};
  cantidadesEditables: Record<string, string> = {};
  modoEdicion: Record<string, boolean> = {};
  estadoEditable: Record<string, string> = {};
  mostrarSelectorEstado: Record<string, boolean> = {};
  productosFraccionables: { [clave: string]: boolean } = {};
mensaje: string = '';
tipo: 'success' | 'danger' | '' = '';

  // NUEVAS propiedades para la cantidad entregada
  modoEditarEntregada: { [clave: string]: boolean } = {};
  cantidadesEntregadasEditables: { [clave: string]: number } = {};

  paginaActual = 1;
  pedidosPorPagina = 5;
  catalogoId = '98082713-6ee7-426d-9d35-8d494a60404c';

  constructor(
    private pedidoSrv: PedidoService,
    private clienteSrv: ClienteService,
    private dirSrv: DireccionService,
    private catalogoSrv: CatalogoService,
    private carritoService: CarritoService,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
  this.auth.esAdminDesdeBackend().subscribe({
    next: isAdmin => {
      this.esAdmin = isAdmin;
      this.cargarPedidos(); // Ahora sí filtrará correctamente
    },
    error: err => {
      console.error('Error comprobando rol admin', err);
      this.esAdmin = false;
      this.cargarPedidos(); // Por si acaso, seguir cargando
    }
  });
}

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

 cargarPedidos(): void {
  this.loading = true;

  this.sub = this.pedidoSrv.getPedidosPorEstados(['Abierto', 'Tramitar', 'Montando', 'Enviado']).pipe(
    switchMap(pedidosBase =>
      forkJoin(
        pedidosBase.map(p =>
          forkJoin({
            cliente: this.clienteSrv.getCliente(p.codUsuario).pipe(
              catchError(() => of({
                sub: p.codUsuario,
                email: '',
                nombre: '—desconocido—',
                apellido: '',
                telefono: '',
                comentario: '',
                rol: 'comprador',
                state: 'Activo',
                createdAt: '',
                updatedAt: '',
                direcciones: []
              } as Cliente))
            ),
            direcciones: this.dirSrv.getDirecciones(p.codUsuario).pipe(
              catchError(() => of([] as Direccion[]))
            ),
            pedido: of(p)
          }).pipe(
            switchMap(({ cliente, direcciones, pedido }) => {
              const pedidoConCliente = PedidoMapper.mapToPedidoConCliente(pedido, cliente, direcciones);

              pedido.productos?.forEach(prod => {
                const clave = `${this.catalogoId}_${prod.codProductoCatalogo}`;

                if (!this.unidadVentaPorProducto[clave]) {
                  this.catalogoSrv.getProducto(this.catalogoId, prod.codProductoCatalogo).subscribe({
                    next: (res) => {
                      this.unidadVentaPorProducto[clave] = res.unidadDeVenta || '—';
                      this.productosFraccionables[clave] = res.fraccionable ?? true;
                    },
                    error: () => {
                      this.unidadVentaPorProducto[clave] = '—';
                      this.productosFraccionables[clave] = true; // Por defecto, fraccionable
                    }
                  });
                }
              });

              return of(pedidoConCliente);
            })
          )
        )
      )
    )
  ).subscribe({
    next: enriched => {
  this.pedidos = this.esAdmin
    ? enriched.filter(p => p.estado !== 'Abierto')  // Admin: todos menos 'Abierto'
    : enriched;

  this.modoEditarEntregada = {};
  this.loading = false;
}
,
    error: err => {
      console.error(err);
      this.error = 'Error al cargar pedidos con detalle de cliente';
      this.loading = false;
    }
  });
}




  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPaginas) {
      this.paginaActual = nuevaPagina;
    }
  }

  get totalPaginas(): number {
    return Math.ceil(this.pedidos.length / this.pedidosPorPagina);
  }

  get pedidosPaginados(): PedidoConCliente[] {
    const inicio = (this.paginaActual - 1) * this.pedidosPorPagina;
    return this.pedidos.slice(inicio, inicio + this.pedidosPorPagina);
  }

  editarPedido(pedidoId: string): void {
    this.pedidoSrv.getPedidoPorId(pedidoId).subscribe(pedido => {
      const catalogoId = this.catalogoId;
      this.carritoService.setPedidoEnEdicionId(pedido.id);
      this.carritoService.setEstadoPedidoEnEdicion(pedido.estado);
      this.carritoService.setCarritoDesdePedido(pedido, catalogoId);
      this.router.navigate(['/catalogos', catalogoId]);
    });
  }

  tramitar(pedidoId: string, productos: any[]): void {
    const cambios = productos.map(prod => {
      const clave = pedidoId + '_' + prod.codProductoCatalogo;
      const nuevaCantidad = parseFloat(this.cantidadesEditables[clave]);
      return (!isNaN(nuevaCantidad) && nuevaCantidad > 0)
        ? { productoCatalogoId: prod.codProductoCatalogo, nuevaCantidad }
        : null;
    }).filter(p => p !== null);

    if (cambios.length === 0) return;

    this.pedidoSrv.tramitarPedido(pedidoId, cambios).subscribe({
      next: () => {
        alert('Cambios aplicados y pedido tramitado');
        this.cargarPedidos();
      },
      error: err => {
        console.error(err);
        alert('Error al tramitar el pedido');
      }
    });
  }

  cancelarPedido(pedidoId: string): void {
    if (!confirm('¿Estás seguro de que deseas cancelar este pedido?')) return;

    this.pedidoSrv.actualizarEstadoPedido(pedidoId, 'Cancelado').subscribe({
      next: () => {
        alert('Pedido cancelado correctamente');
        this.cargarPedidos();
      },
      error: err => {
        console.error(err);
        alert('Error al cancelar el pedido');
      }
    });
  }

  actualizarEstado(pedidoId: string, nuevoEstado: string): void {
    this.pedidoSrv.actualizarEstadoPedido(pedidoId, nuevoEstado).subscribe({
      next: () => this.cargarPedidos(),
      error: err => {
        console.error(err);
        alert('Error al actualizar el estado');
      }
    });
  }

  toggleDireccion(id: string): void {
    this.isAddressVisible[id] = !this.isAddressVisible[id];
  }

  toggleProductos(id: string): void {
    this.isProductosVisible[id] = !this.isProductosVisible[id];
  }

  editarCantidad(pedidoId: string, prodId: string, cantidadActual: number): void {
    const clave = pedidoId + '_' + prodId;
    this.cantidadesEditables[clave] = cantidadActual.toString();
    this.modoEdicion[clave] = true;
  }

  editarCantidadEntregada(pedidoId: string, productoId: string, cantidadActual: number): void {
    const clave = pedidoId + '_' + productoId;
    this.modoEditarEntregada[clave] = true;
    this.cantidadesEntregadasEditables[clave] = cantidadActual ?? 0;
  }

 guardarCantidadEntregada(pedidoId: string, lineaId: string, codProductoCatalogo: string, nuevaCantidad: number): void {
  const claveEdicion = pedidoId + '_' + lineaId;
  const claveProducto = `${this.catalogoId}_${codProductoCatalogo}`;
  const qty = Number(nuevaCantidad);
  const fraccionable = this.productosFraccionables?.[claveProducto] ?? true;

  const invalido = nuevaCantidad === null || isNaN(qty) || qty <= 0 || (!fraccionable && !Number.isInteger(qty));

  if (invalido) {
    this.mensaje = fraccionable
      ? 'Introduce una cantidad válida'
      : 'Solo se permiten cantidades enteras para este producto';
    this.tipo = 'danger';
    setTimeout(() => this.mensaje = '', 3000);
    return;
  }

  this.pedidoSrv.actualizarCantidadEntregada(lineaId, qty).subscribe({
    next: () => {
      this.modoEditarEntregada[claveEdicion] = false;
      this.mensaje = 'Cantidad entregada actualizada correctamente';
      this.tipo = 'success';
      this.cargarPedidos();
      setTimeout(() => this.mensaje = '', 3000);
    },
    error: () => {
      this.mensaje = 'Error al actualizar la cantidad entregada';
      this.tipo = 'danger';
      setTimeout(() => this.mensaje = '', 3000);
    }
  });
}




}
