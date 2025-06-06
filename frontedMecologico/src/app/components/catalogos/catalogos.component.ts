import { Component, OnInit } from '@angular/core';
import { Catalogo, CatalogoService } from '../../services/catalogo.service';
import { Router } from '@angular/router';
import { PedidoService } from '../../services/pedido.service';
import { Pedido } from '../../models/pedido.model';
import { map } from 'rxjs';
import { CarritoService } from '../../services/carrito.service';
import { Cliente } from '../../models/cliente.model';
import { AuthService } from '../../services/auth.service';
import { CatalogoCreateDto } from '../../models/catalogo-create.dto';

@Component({
  selector: 'app-catalogos',
  templateUrl: './catalogos.component.html',
  styleUrl: './catalogos.component.css',
  standalone: false
})
export class CatalogosComponent implements OnInit {
  catalogos: Catalogo[] = [];
  loading   = true;
  usuarioActual: Cliente | null = null;
  isExpanded: Record<string, boolean> = {};
  pedidosPorCatalogo: Record<string, Pedido[]> = {};
  mostrarDetallesPedido: Record<string, boolean> = {};
  mostrarFormularioEditar: string | null = null;

  mostrarFormularioCrear = false;
   nuevoCatalogo: CatalogoCreateDto = {
    nombre: '',
    status: 'Activo'
  };
  esAdministrador = false;
  usuario?: Cliente;
  constructor(
    private srv: CatalogoService, 
    private pedidoSrv: PedidoService,  
    private router: Router,
    private carritoSrv: CarritoService,
    private auth: AuthService,
    private catalogoSrv: CatalogoService
  ) {}

  ngOnInit(): void {
  this.loading = true;

  this.auth.esAdminDesdeBackend().subscribe(isAdmin => {
    this.esAdministrador = isAdmin;

    this.srv.getCatalogos().subscribe({
      next: cats => {
        this.catalogos = cats;
        cats.forEach(c => this.isExpanded[c.id] = false);
        this.loading = false;
      },
      error: err => {
        console.error('Error cargando catálogos:', err);
        this.loading = false;
      }
    });
  });
}



  pedidos(c: Catalogo): Pedido[] {
    return this.pedidosPorCatalogo[c.id] || [];
  }
   esAdmin(): boolean {
  return this.auth.getUsuarioActual()?.rol === 'administrador';
}

  crearCatalogo(): void {
    this.catalogoSrv.crearCatalogo(this.nuevoCatalogo).subscribe({
      next: (res) => {
        this.catalogos.push(res);
        this.mostrarFormularioCrear = false;
        this.nuevoCatalogo = { nombre: '', status: 'Activo' };
      },
      error: (err) => {
        console.error('❌ Error al crear catálogo:', err);
      }
    });
  }

  editarCatalogo(id: string): void {
  this.catalogoSrv.actualizarCatalogo(id, this.nuevoCatalogo).subscribe({
    next: updated => {
      const idx = this.catalogos.findIndex(c => c.id === id);
      if (idx !== -1) {
        this.catalogos[idx] = updated;
      }
      this.mostrarFormularioEditar = null;
      this.nuevoCatalogo = { nombre: '', status: 'Activo' };
    },
    error: err => console.error('❌ Error actualizando catálogo:', err)
  });
}

confirmarEliminacion(id: string): void {
  if (confirm('¿Estás seguro de eliminar este catálogo?')) {
    this.eliminarCatalogo(id);
  }
}

eliminarCatalogo(id: string): void {
  if (!confirm('¿Estás seguro de que deseas eliminar este catálogo?')) return;

  this.catalogoSrv.deleteCatalogo(id).subscribe({
    next: () => {
      this.catalogos = this.catalogos.filter(c => c.id !== id);
    },
    error: (err) => {
      console.error('❌ Error al eliminar catálogo:', err);
    }
  });
}


cancelarEdicion(): void {
  this.mostrarFormularioEditar = null;
  this.nuevoCatalogo = { nombre: '', status: 'Activo' };
}

  toggleDetalle(c: Catalogo): void {
    const id = c.id;
    this.isExpanded[id] = !this.isExpanded[id];

    if (this.isExpanded[id] && !this.pedidosPorCatalogo[id]) {
      this.pedidoSrv.getPedidosPorCatalogo(id)
        .pipe(
          map((list: Pedido[]) =>
            list.filter(p =>
              ['Abierto', 'Montando', 'Enviado'].includes(p.estado)
            )
          )
        )
        .subscribe({
          next: (filtered: Pedido[]) => {
            this.pedidosPorCatalogo[id] = filtered;
          },
          error: err => {
            console.error(`Error cargando pedidos para catálogo ${id}:`, err);
            this.pedidosPorCatalogo[id] = [];
          }
        });
    }
  }

  hacerPedido(c: Catalogo): void {
    this.router.navigate(['/catalogos', c.id]);
  }

  iniciarNuevoPedido(c: Catalogo): void {
  this.carritoSrv.limpiarCarrito();
  this.router.navigate(['/catalogos', c.id]);
}

  consultarPedidos(c: Catalogo): void {
    this.router.navigate(['/pedidos'], { queryParams: { catalogo: c.id } });
  }

  toggleDetallePedido(pedidoId: string): void {
    this.mostrarDetallesPedido[pedidoId] = !this.mostrarDetallesPedido[pedidoId];
  }

  editarPedido(pedido: Pedido, catalogoId: string): void {
  this.pedidoSrv.getPedidoPorId(pedido.id).subscribe(pedidoCompleto => {
    if (!catalogoId) {
      console.error('❌ El pedido no tiene catalogoId');
      return;
    }

    
    this.carritoSrv.setEstadoPedidoEnEdicion(pedidoCompleto.estado);
    this.carritoSrv.setCarritoDesdePedido(pedidoCompleto, catalogoId);
    this.router.navigate(['/catalogos', catalogoId]);
  });
}

}
