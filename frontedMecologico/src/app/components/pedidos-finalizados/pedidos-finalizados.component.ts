import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Pedido, LineaPedido, PedidoCompletoCreateDto, PedidoConCliente } from '../../models/pedido.model'; 

import { ClienteService } from '../../services/cliente.service';
import { DireccionService } from '../../services/direccion.service';
import { Cliente, Direccion } from '../../models/cliente.model';
import { CatalogoService } from '../../services/catalogo.service';
import { PedidoService } from '../../services/pedido.service';


@Component({
  selector: 'app-pedidos-finalizados',
  templateUrl: './pedidos-finalizados.component.html',
  styleUrls: ['./pedidos-finalizados.component.css'],
  standalone: false
})
export class PedidosFinalizadosComponent implements OnInit, OnDestroy {
  pedidos: PedidoConCliente[] = [];
  loading = false;
  error = '';
  private sub!: Subscription;

  isAddressVisible: Record<string, boolean> = {};
  isProductosVisible: Record<string, boolean> = {};
  unidadVentaPorProducto: Record<string, string> = {};

  paginaActual = 1;
  pedidosPorPagina = 5;

  catalogoId = '98082713-6ee7-426d-9d35-8d494a60404c';

  constructor(
    private pedidoSrv: PedidoService,
    private clienteSrv: ClienteService,
    private dirSrv: DireccionService,
    private catalogoSrv: CatalogoService
  ) {}

  ngOnInit(): void {
    this.loading = true;

    this.sub = this.pedidoSrv.getPedidosPorEstados(['Cancelado', 'Cerrado', 'Pagado'])
      .pipe(
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
                 const pc: PedidoConCliente = {
  ...pedido,
  nombreUsuario: cliente.nombre,
  direccionPedido: pedido.direccion || '—sin dirección—'
};


                  pedido.productos?.forEach(prod => {
                    const clave = `${this.catalogoId}_${prod.codProductoCatalogo}`;
                    if (!this.unidadVentaPorProducto[clave]) {
                      this.catalogoSrv.getProducto(this.catalogoId, prod.codProductoCatalogo).subscribe({
                        next: (res) => {
                          this.unidadVentaPorProducto[clave] = res.unidadDeVenta || '—';
                        },
                        error: () => {
                          this.unidadVentaPorProducto[clave] = '—';
                        }
                      });
                    }
                  });

                  return of(pc);
                })
              )
            )
          )
        )
      )
      .subscribe({
        next: enriched => {
          this.pedidos = enriched;
          this.loading = false;
        },
        error: err => {
          console.error(err);
          this.error = 'Error al cargar pedidos finalizados';
          this.loading = false;
        }
      });
  }

  toggleDireccion(id: string): void {
    this.isAddressVisible[id] = !this.isAddressVisible[id];
  }

  toggleProductos(id: string): void {
    this.isProductosVisible[id] = !this.isProductosVisible[id];
  }

  get totalPaginas(): number {
    return Math.ceil(this.pedidos.length / this.pedidosPorPagina);
  }

  get pedidosPaginados(): PedidoConCliente[] {
    const inicio = (this.paginaActual - 1) * this.pedidosPorPagina;
    return this.pedidos.slice(inicio, inicio + this.pedidosPorPagina);
  }

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPaginas) {
      this.paginaActual = nuevaPagina;
    }
  }

  ngOnDestroy(): void {
    if (this.sub) this.sub.unsubscribe();
  }
}
