import { Component, OnInit } from '@angular/core';
import { CarritoService } from '../../services/carrito.service';
import { Direccion } from '../../models/cliente.model';
import { ClienteService } from '../../services/cliente.service';
import { AuthService } from '../../services/auth.service';
import { PedidoService } from '../../services/pedido.service';
import { CatalogoService } from '../../services/catalogo.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tramitar-pedido',
  standalone: false,
  templateUrl: './tramitar-pedido.component.html',
  styleUrl: './tramitar-pedido.component.css'
})
export class TramitarPedidoComponent implements OnInit {
  esCreacion = false;
  esEdicion = false;
  esTramitacionVisual = false;

  estadoPedido: string | null = null;
  carrito: any[] = [];
  productosDetalles: { [id: string]: any } = {};
  modoEntrega: string = 'recoger';
  direcciones: Direccion[] = [];
  direccionSeleccionada: string = '';
  nuevaDireccionVisible = false;
  mensajeExito: string | null = null;

  // Checkbox para indicar si se quiere guardar la nueva dirección
  guardarNuevaDireccion: boolean = false;

  nuevaDireccion = {
    direccion: '',
    codigoPostal: '',
    municipio: '',
    provincia: ''
  };

  constructor(
    private carritoSrv: CarritoService,
    private auth: AuthService,
    private clienteSrv: ClienteService,
    private pedidoSrv: PedidoService,
    private catalogoSrv: CatalogoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.carrito = this.carritoSrv.getCarritoActual();
    this.cargarDetallesProductos();
    const sub = this.auth.getUserSub();
    this.obtenerDireccionesSiLogueado(!!sub);
    this.estadoPedido = this.carritoSrv.getEstadoPedidoEnEdicion();

  }
calcularTotalSinIva(): number {
  return this.carrito.reduce((sum, p) => sum + p.precio * p.cantidadPedida, 0);
}

calcularTotalConIva(): number {
  return this.calcularTotalSinIva() * 1.21;
}

  cargarDetallesProductos(): void {
    const catalogoId = this.carritoSrv.getCatalogoId();
    if (!catalogoId) {
      console.warn('No hay catálogoId disponible para cargar los productos');
      return;
    }
    this.carrito.forEach(item => {
      this.catalogoSrv.getProducto(catalogoId, item.codProductoCatalogo || item.id).subscribe({
        next: (producto: any) => {
          this.productosDetalles[item.codProductoCatalogo || item.id] = producto;
        },
        error: err => {
          console.error('❌ Error cargando detalles del producto:', err);
        }
      });
    });
  }

  finalizarTramitacion(): void {
  const usuarioSub = this.auth.getUserSub();
  const catalogoId = this.carritoSrv.getCatalogoId();
  const pedidoId = this.carritoSrv.getPedidoEnEdicionId(); // puede ser null/undefined si no se llamó al set
  const productos = this.carritoSrv.getCarritoActual();

  if (!usuarioSub || !catalogoId || productos.length === 0) {
    console.warn('❌ No se puede finalizar el pedido: faltan datos');
    return;
  }

  const direccionFinal = this.modoEntrega === 'domicilio'
    ? this.direccionSeleccionada
    : 'RECOGER_EN_TIENDA';

  const entrega = 1;

  const pedidoDto = {
    codUsuario: usuarioSub,
    catalogoId,
    direccion: direccionFinal,
    entrega,
    lineas: productos.map(p => ({
      codProductoCatalogo: p.codProductoCatalogo || p.id,
      cantidadPedida: p.cantidadPedida
    }))
  };

  if (!!pedidoId && pedidoId !== '') {
    console.log('📡 [PUT] Pedido existente (ID:', pedidoId, '), actualizando y marcando como "Tramitar"');
    this.pedidoSrv.actualizarPedido(pedidoId, pedidoDto).subscribe({
      next: () => {
        this.pedidoSrv.actualizarEstadoPedido(pedidoId, 'Tramitar').subscribe({
          next: () => {
            this.mensajeExito = '📦 Pedido actualizado y marcado como "Tramitar"';
            this.carritoSrv.limpiarCarrito();
            setTimeout(() => this.router.navigate(['/catalogos', catalogoId]), 1500);
          },
          error: err => console.error('❌ Error al cambiar estado a Tramitar:', err)
        });
      },
      error: err => console.error('❌ Error al hacer PUT del pedido:', err)
    });
  } else {
    console.warn('ℹ️ No hay pedidoId definido, se procederá a crear nuevo pedido');
    console.log('🆕 [POST] Pedido nuevo, creándolo como "Tramitar"');
    this.pedidoSrv.finalizarPedido(pedidoDto).subscribe({
      next: res => {
        this.pedidoSrv.actualizarEstadoPedido(res.id, 'Tramitar').subscribe({
          next: () => {
            this.mensajeExito = '📦 Pedido creado y marcado como "Tramitar"';
            this.carritoSrv.limpiarCarrito();
            setTimeout(() => this.router.navigate(['/catalogos', catalogoId]), 1500);
          },
          error: err => console.error('❌ Error al cambiar estado a Tramitar tras POST:', err)
        });
      },
      error: err => console.error('❌ Error al hacer POST del pedido:', err)
    });
  }
}


  calcularTotal(): number {
    return this.carrito.reduce((sum, item) => sum + (item.precio * item.cantidadPedida), 0);
  }

  private obtenerDireccionesSiLogueado(isLoggedIn: boolean): void {
    if (isLoggedIn) {
      const sub = this.auth.getUserSub();
      if (sub) {
        this.clienteSrv.getDirecciones(sub).subscribe(dirs => {
          this.direcciones = dirs;
        });
      }
    } else {
      this.direcciones = [];
    }
  }

  // Guardar dirección y devolver observable
  guardarDireccionComoObservable() {
    const sub = this.auth.getUserSub();
    if (!sub) return null;

    const direccionDto = {
      direccion: this.nuevaDireccion.direccion,
      codigoPostal: this.nuevaDireccion.codigoPostal,
      municipio: this.nuevaDireccion.municipio,
      provincia: this.nuevaDireccion.provincia,
      esDefault: false
    };

    return this.clienteSrv.crearDireccion(sub, direccionDto);
  }

  confirmarTramitacion(): void {
    // Si el checkbox está marcado, guarda la dirección antes de tramitar el pedido
    if (this.nuevaDireccionVisible && this.guardarNuevaDireccion) {
      const obs = this.guardarDireccionComoObservable();
      if (obs) {
        obs.subscribe({
          next: (res) => {
            this.direcciones.push(res);
            this.finalizarPedido();
          },
          error: (err) => {
            console.error('❌ Error al guardar dirección:', err);
            this.finalizarPedido();
          }
        });
        return;
      }
    }
    this.finalizarPedido();
  }

  finalizarPedido(): void {
    const usuarioSub = this.auth.getUserSub();
    const catalogoId = this.carritoSrv.getCatalogoId();
    const pedidoId = this.carritoSrv.getPedidoEnEdicionId();

    if (!usuarioSub || !catalogoId || this.carrito.length === 0) {
      console.warn('❌ No se puede finalizar pedido: faltan datos');
      return;
    }

    let direccionFinal = '';
    let entrega = 1;

    if (this.modoEntrega === 'recoger') {
      direccionFinal = 'RECOGER_EN_TIENDA';
    } else {
      entrega = 0;
      if (this.nuevaDireccionVisible) {
        const { direccion, codigoPostal, municipio, provincia } = this.nuevaDireccion;
        direccionFinal = `${direccion}${codigoPostal ? ', ' + codigoPostal : ''}${municipio ? ' ' + municipio : ''}${provincia ? ' ' + provincia : ''}`;
      } else {
        const direccionObj = this.direcciones.find(d => d.id === this.direccionSeleccionada);
        direccionFinal = direccionObj
          ? `${direccionObj.direccion}${direccionObj.codigoPostal ? ', ' + direccionObj.codigoPostal : ''}${direccionObj.municipio ? ' ' + direccionObj.municipio : ''}${direccionObj.provincia ? ' ' + direccionObj.provincia : ''}`
          : 'DIRECCIÓN NO DISPONIBLE';
      }
    }

    const pedidoDto = {
      codUsuario: usuarioSub,
      catalogoId,
      direccion: direccionFinal,
      entrega,
      lineas: this.carrito.map(item => ({
        codProductoCatalogo: item.codProductoCatalogo || item.id,
        cantidadPedida: item.cantidadPedida
      }))
    };

    if (this.esCreacion) {
      this.pedidoSrv.finalizarPedido(pedidoDto).subscribe({
        next: () => {
          this.mensajeExito = '✅ Pedido creado con éxito';
          this.carritoSrv.limpiarCarrito();
          setTimeout(() => this.router.navigate(['/catalogos', catalogoId]), 1500);
        },
        error: err => console.error('❌ Error al crear pedido:', err)
      });

    } else if (this.esEdicion) {
      this.pedidoSrv.actualizarPedido(pedidoId!, pedidoDto).subscribe({
        next: () => {
          this.mensajeExito = '✅ Pedido actualizado con éxito';
          this.carritoSrv.limpiarCarrito();
          setTimeout(() => this.router.navigate(['/catalogos', catalogoId]), 1500);
        },
        error: err => console.error('❌ Error al actualizar pedido:', err)
      });

    } else if (this.esTramitacionVisual) {
      this.pedidoSrv.actualizarPedido(pedidoId!, pedidoDto).subscribe({
        next: () => {
          this.pedidoSrv.actualizarEstadoPedido(pedidoId!, 'Montando').subscribe({
            next: () => {
              this.mensajeExito = '🚚 Pedido tramitado correctamente';
              this.carritoSrv.limpiarCarrito();
              setTimeout(() => this.router.navigate(['/catalogos', catalogoId]), 1500);
            },
            error: err => console.error('❌ Error al cambiar estado:', err)
          });
        },
        error: err => console.error('❌ Error al actualizar pedido antes de tramitar:', err)
      });
    } else {
      console.warn('⚠️ Modo desconocido, no se puede procesar el pedido');
    }
  }

  cancelarTramitacion(): void {
  const pedidoId = this.carritoSrv.getPedidoEnEdicionId();
  const catalogoId = this.carritoSrv.getCatalogoId();
  if (!pedidoId) return;

  this.pedidoSrv.actualizarEstadoPedido(pedidoId, 'Cancelado').subscribe({
    next: () => {
      this.mensajeExito = '🗑️ Pedido cancelado correctamente';
      this.carritoSrv.limpiarCarrito();
      setTimeout(() => {
        if (catalogoId) {
          this.router.navigate(['/catalogos', catalogoId]);
        } else {
          this.router.navigate(['/catalogos']);
        }
      }, 1500);
    },
    error: err => console.error('❌ Error al cancelar pedido:', err)
  });
}


  volverAlCatalogo(): void {
    const catalogoId = this.carritoSrv.getCatalogoId();
    if (catalogoId) {
      this.router.navigate(['/catalogos', catalogoId]);
    }
  }

  editarCantidad(p: any): void {
    p.editando = true;
    p.nuevaCantidad = p.cantidadPedida;
  }

  tramitarPedidoAhora(): void {
  const pedidoId = this.carritoSrv.getPedidoEnEdicionId();
  const productos = this.carritoSrv.getCarritoActual();
  const catalogoId = this.carritoSrv.getCatalogoId();
  const usuarioSub = this.auth.getUserSub();

  if (!pedidoId || !catalogoId || !usuarioSub || productos.length === 0) {
    console.warn('❌ Faltan datos para tramitar pedido');
    return;
  }

  let direccionFinal = '';
  let entrega = 1;

  if (this.modoEntrega === 'recoger') {
    direccionFinal = 'RECOGER_EN_TIENDA';
  } else {
    entrega = 0;
    if (this.nuevaDireccionVisible) {
      const { direccion, codigoPostal, municipio, provincia } = this.nuevaDireccion;
      direccionFinal = `${direccion}${codigoPostal ? ', ' + codigoPostal : ''}${municipio ? ' ' + municipio : ''}${provincia ? ' ' + provincia : ''}`;
    } else {
      const direccionObj = this.direcciones.find(d => d.id === this.direccionSeleccionada);
      direccionFinal = direccionObj
        ? `${direccionObj.direccion}${direccionObj.codigoPostal ? ', ' + direccionObj.codigoPostal : ''}${direccionObj.municipio ? ' ' + direccionObj.municipio : ''}${direccionObj.provincia ? ' ' + direccionObj.provincia : ''}`
        : 'DIRECCIÓN NO DISPONIBLE';
    }
  }

  const dto = {
    codUsuario: usuarioSub,
    catalogoId,
    direccion: direccionFinal,
    entrega,
    lineas: productos.map(p => ({
      codProductoCatalogo: p.codProductoCatalogo || p.id,
      cantidadPedida: p.cantidadPedida
    }))
  };

  this.pedidoSrv.actualizarPedido(pedidoId, dto).subscribe({
    next: () => {
      // 🟡 Después de guardar, actualiza el estado a "Tramitar"
      this.pedidoSrv.actualizarEstadoPedido(pedidoId, 'Tramitar').subscribe({
        next: () => {
          this.mensajeExito = '📦 Pedido marcado como "Tramitar" correctamente';
          this.carritoSrv.limpiarCarrito();
          setTimeout(() => this.router.navigate(['/catalogos', catalogoId]), 1500);
        },
        error: err => {
          console.error('❌ Error al cambiar estado a Tramitar:', err);
        }
      });
    },
    error: err => {
      console.error('❌ Error al actualizar pedido antes de tramitar:', err);
    }
  });
}

  confirmarCantidad(p: any): void {
    const nuevaCantidad = parseFloat(p.nuevaCantidad);
    if (nuevaCantidad > 0) {
      p.cantidadPedida = nuevaCantidad;
      p.editando = false;

      const carritoActual = this.carrito.map(item =>
        item.codProductoCatalogo === p.codProductoCatalogo ? p : item
      );
      this.carritoSrv.actualizarCarrito(carritoActual);
      this.carrito = carritoActual;
    }
  }

  eliminar(productoId: string): void {
    this.carritoSrv.eliminarProducto(productoId);
    this.carrito = this.carritoSrv.getCarritoActual();
    if (this.carrito.length === 0) {
      this.carritoSrv.limpiarCarrito();
    }
  }
}
