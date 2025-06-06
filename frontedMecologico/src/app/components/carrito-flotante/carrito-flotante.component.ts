import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { Subscription } from 'rxjs';
import { CarritoService } from '../../services/carrito.service';
import { PedidoService } from '../../services/pedido.service';
import { AuthService } from '../../services/auth.service';
import { ClienteService } from '../../services/cliente.service';
import { Router } from '@angular/router';
import { MensajeService } from '../../services/mensaje.service';

@Component({
  selector: 'app-carrito-flotante',
  templateUrl: './carrito-flotante.component.html',
  styleUrls: ['./carrito-flotante.component.css'],
  standalone: false
})
export class CarritoFlotanteComponent implements OnInit, OnDestroy {
  carrito: any[] = [];
  visible = true;
  mostrarErrorLogin = false;
  mostrarConfirmacionCancelacion = false;
  private carritoSub!: Subscription;
  private loginSub!: Subscription;
  estadoPedido: string | null = null;

  constructor(
    public carritoSrv: CarritoService,
    public pedidoSrv: PedidoService,
    public auth: AuthService,
    private clienteSrv: ClienteService,
    private cdRef: ChangeDetectorRef,
    private ngZone: NgZone,
    private router: Router,
    public mensajeSrv: MensajeService
  ) {}

  ngOnInit(): void {
    this.carritoSub = this.carritoSrv.carrito$.subscribe(items => {
      this.carrito = items.map(item => ({
        ...item,
        unidadDeVenta: item.unidadDeVenta || '—',
        nombre: item.nombre || item.nombreComercial || item.nombreProducto || '—'
      }));
      this.estadoPedido = this.carritoSrv.getEstadoPedidoEnEdicion();

      // ✅ Mostrar el carrito siempre, incluso vacío
      this.visible = true;
      this.cdRef.detectChanges();
    });

    this.loginSub = this.auth.loginEvent$.subscribe(isLoggedIn => {
      this.actualizarEstadoLogin(isLoggedIn);
      this.obtenerDireccionesSiLogueado(isLoggedIn);
    });

    const yaLogueado = this.auth.isLogged();
    this.actualizarEstadoLogin(yaLogueado);
    this.obtenerDireccionesSiLogueado(yaLogueado);
  }

  ngOnDestroy(): void {
    this.carritoSub?.unsubscribe();
    this.loginSub?.unsubscribe();
  }

  calcularTotal(): number {
    return this.carrito.reduce((sum, item) => sum + (item.precio * item.cantidadPedida), 0);
  }

  calcularTotalSinIva(): number {
    return this.carrito.reduce((sum, item) => sum + item.precio * item.cantidadPedida, 0);
  }

  calcularTotalConIva(): number {
    return this.calcularTotalSinIva() * 1.21;
  }

  pedirConfirmacionCancelacion(): void {
  const hayProductos = this.carritoSrv.getCarritoActual().length > 0;

  if (hayProductos) {
    this.mostrarConfirmacionCancelacion = true;
  } else {
    this.carritoSrv.limpiarCarrito();
    this.mensajeSrv.mostrar('🗑️ Carrito cancelado sin guardar');
    this.router.navigate(['/catalogos']);
  }
}


  editarCantidad(p: any): void {
    p.editando = true;
    p.nuevaCantidad = p.cantidadPedida;
  }

  confirmarCantidad(p: any): void {
  const nuevaCantidad = parseFloat(p.nuevaCantidad);
  if (nuevaCantidad > 0) {
    // Actualiza en memoria
    p.cantidadPedida = nuevaCantidad;
    p.editando = false;

    // ✅ Actualiza en carrito local
    this.carritoSrv.actualizarCantidad(p.codProductoCatalogo || p.id, nuevaCantidad);

    // ✅ Actualiza en base de datos si hay pedido existente
    const pedidoId = this.carritoSrv.getPedidoEnEdicionId();
    if (pedidoId) {
      this.pedidoSrv.actualizarCantidadDeLinea(pedidoId, p.codProductoCatalogo || p.id, nuevaCantidad).subscribe({
        error: err => console.error('❌ Error al hacer PUT de cantidad editada:', err)
      });
    }

    // Opcional: refresca el array
    this.carrito = this.carritoSrv.getCarritoActual();
  }
}


  eliminar(productoId: string): void {
    this.carritoSrv.eliminarProducto(productoId);
  }

  cerrarYLimpiar(): void {
    this.carritoSrv.cancelarPedidoDesdeCarrito();
    this.visible = false; 
    
  }

  guardarPedido(): void {
    const codUsuario = this.auth.getUserSub();
    const catalogoId = this.carritoSrv.getCatalogoId();
    const productos = this.carrito.map(p => ({
      codProductoCatalogo: p.codProductoCatalogo || p.id,
      cantidadPedida: p.cantidadPedida
    }));

    if (!codUsuario || !catalogoId || productos.length === 0) {
      this.mensajeSrv.mostrar('⚠️ No se puede guardar. Faltan datos.', 'warning');
      return;
    }

    const dto = {
      codUsuario,
      catalogoId,
      direccion: '-',
      entrega: 1,
      lineas: productos
    };

    if (this.carritoSrv.tienePedidoAsociado()) {
      const pedidoId = this.carritoSrv.getPedidoEnEdicionId();
      this.pedidoSrv.actualizarPedido(pedidoId!, dto).subscribe({
        next: () => this.mensajeSrv.mostrar('✅ Pedido actualizado con éxito'),
        error: () => this.mensajeSrv.mostrar('❌ Error al actualizar pedido', 'danger')
      });
    } else {
      this.pedidoSrv.finalizarPedido(dto).subscribe({
        next: res => {
          this.carritoSrv.setPedidoEnEdicionId(res.id);
          this.mensajeSrv.mostrar('✅ Pedido creado correctamente');
        },
        error: () => this.mensajeSrv.mostrar('❌ Error al crear pedido', 'danger')
      });
    }
  }

  confirmarCancelacion(): void {
  const pedidoId = this.carritoSrv.getPedidoEnEdicionId();
  if (pedidoId) {
    this.pedidoSrv.actualizarEstadoPedido(pedidoId, 'Cancelado').subscribe({
      next: () => {
        this.carritoSrv.limpiarCarrito();
        this.mensajeSrv.mostrar('🗑️ Pedido cancelado con éxito');
        this.router.navigate(['/catalogos']);
      },
      error: () => {
        this.mensajeSrv.mostrar('❌ Error al cancelar el pedido', 'danger');
      }
    });
  } else {
    this.carritoSrv.limpiarCarrito();
    this.mensajeSrv.mostrar('🗑️ Carrito cancelado sin guardar');
    this.router.navigate(['/catalogos']);
  }
}

cancelarConfirmacion(): void {
  this.mostrarConfirmacionCancelacion = false;
}


  tramitarPedidoAhora(): void {
  this.carritoSrv.setSalidaVoluntaria(true); // 🔒 Salida controlada
  this.router.navigate(['/tramitarPedidos']);    // 🔁 Navegación segura
}


  private actualizarEstadoLogin(isLoggedIn: boolean): void {
    this.ngZone.run(() => {
      this.mostrarErrorLogin = !isLoggedIn;
      if (!isLoggedIn) this.visible = false;
      this.cdRef.detectChanges();
    });
  }

  private obtenerDireccionesSiLogueado(isLoggedIn: boolean): void {
    if (isLoggedIn) {
      const sub = this.auth.getUserSub();
      if (sub) {
        this.clienteSrv.getDirecciones(sub).subscribe();
      }
    }
  }
}
