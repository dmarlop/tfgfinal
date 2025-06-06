import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CatalogoService, Catalogo, ProductoCatalogo } from '../../services/catalogo.service';
import { CarritoService } from '../../services/carrito.service';
import { Observable, of, Subscription } from 'rxjs';
import { MensajeService } from '../../services/mensaje.service';
import { CanComponentDeactivate } from '../../guards/can-deactivate.interface';
import { Router } from '@angular/router';
import { ProductoCatalogoService } from '../../services/producto-catalogo.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-catalogo-productos',
  templateUrl: './catalogo-productos.component.html',
  styleUrls: ['./catalogo-productos.component.css'],
  standalone: false
})
export class CatalogoProductosComponent implements OnInit, CanComponentDeactivate {
  catalogoId!: string;
  catalogoNombre = '';
  private carritoSub!: Subscription;
  private mensajeSub!: Subscription;
  productosEnCarrito = new Set<string>();
  mostrarCategorias = false;
  mostrarSubcategorias = false;
  mostrarCaracteristicas = false;
  productos: ProductoCatalogo[] = [];
  loading = true;
  estadoPedido: string | null = null;

  features: string[] = [];
  selectedFeatures: string[] = [];

  categories: string[] = [];
  selectedCategories: string[] = [];

  subcategories: string[] = [];
  selectedSubcategories: string[] = [];

  cantidades: Record<string, string> = {};
  erroresCantidad: Record<string, boolean> = {};
  detalleAbierto: Record<string, boolean> = {};

  paginaActual = 1;
  productosPorPagina = 10;
esAdmin = false;
  mensaje: string | null = null;
  tipo: 'success' | 'danger' | 'warning' | null = null;

  terminoBusqueda: string = '';

  constructor(
    private route: ActivatedRoute,
    private catalogoSrv: CatalogoService,
    private carritoSrv: CarritoService,
    private mensajeSrv: MensajeService,
    public router: Router,
    private productoCatalogoSrv: ProductoCatalogoService,
    private auth: AuthService
  ) {
    this.catalogoId = this.route.snapshot.paramMap.get('id')!;
  }

  ngOnInit(): void {
    this.loadCatalogo();
    this.loadProductos();
    this.estadoPedido = this.carritoSrv.getEstadoPedidoEnEdicion();
 this.auth.esAdminDesdeBackend().subscribe({
    next: res => this.esAdmin = res,
    error: err => console.error('❌ Error comprobando rol admin:', err)
  });
    this.carritoSrv.crearCarritoSiNoExiste(this.catalogoId);
    this.carritoSrv.setCarritoVisible(true); 
    this.carritoSub = this.carritoSrv.carrito$.subscribe(items => {
      this.productosEnCarrito.clear();
      items.forEach(p => this.productosEnCarrito.add(p.codProductoCatalogo));
    });

    this.mensajeSub = this.mensajeSrv.mensaje$.subscribe(m => {
      if (m) {
        this.mensaje = m.texto;
        this.tipo = m.tipo;
      } else {
        this.mensaje = null;
        this.tipo = null;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.carritoSub) this.carritoSub.unsubscribe();
    if (this.mensajeSub) this.mensajeSub.unsubscribe();
  }

  private loadCatalogo(): void {
    this.catalogoSrv.getCatalogo(this.catalogoId).subscribe({
      next: (cat: Catalogo) => this.catalogoNombre = cat.nombre,
      error: err => console.error('Error cargando catálogo:', err)
    });
  }

  canDeactivate(): Observable<boolean> | boolean {
    const salidaVoluntaria = this.carritoSrv.getSalidaVoluntaria();
    if (salidaVoluntaria) return true;

    const hayProductos = this.carritoSrv.getCarritoActual().length > 0;
    if (!hayProductos) return true;

    const confirmacion = window.confirm('⚠️ ¡Tienes productos en el carrito! ¿Deseas salir y perder el proceso?');
    return of(confirmacion);
  }

  private loadProductos(): void {
    this.loading = true;
    this.catalogoSrv.getProductos(this.catalogoId).subscribe({
      next: prods => {
        this.productos = prods;
        prods.forEach(p => {
          this.cantidades[p.id] = '';
          this.erroresCantidad[p.id] = false;
        });

        this.features = Array.from(new Set(prods.flatMap(p => p.caracteristicas || []))).sort();
        this.categories = Array.from(new Set(prods.map(p => p.categoriaNombre).filter((n): n is string => !!n))).sort();
        this.subcategories = Array.from(new Set(prods.map(p => p.subcategoriaNombre).filter((n): n is string => !!n))).sort();

        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  toggleFeature(feature: string): void {
    const i = this.selectedFeatures.indexOf(feature);
    if (i >= 0) this.selectedFeatures.splice(i, 1);
    else this.selectedFeatures.push(feature);
    this.paginaActual = 1;
  }

  toggleCategory(cat: string): void {
    const i = this.selectedCategories.indexOf(cat);
    if (i >= 0) this.selectedCategories.splice(i, 1);
    else this.selectedCategories.push(cat);
    this.paginaActual = 1;
  }

  toggleSubcategory(sub: string): void {
    const i = this.selectedSubcategories.indexOf(sub);
    if (i >= 0) this.selectedSubcategories.splice(i, 1);
    else this.selectedSubcategories.push(sub);
    this.paginaActual = 1;
  }

  get availableSubcategories(): string[] {
    if (!this.selectedCategories.length) return this.subcategories;
    return Array.from(new Set(
      this.productos
        .filter(p => p.categoriaNombre && this.selectedCategories.includes(p.categoriaNombre))
        .map(p => p.subcategoriaNombre)
        .filter((n): n is string => !!n)
    )).sort();
  }

  get filteredProducts(): ProductoCatalogo[] {
    const termino = this.terminoBusqueda.trim().toLowerCase();
    return this.productos.filter(p => {
      const matchFeat = this.selectedFeatures.every(f => p.caracteristicas?.includes(f));
      const matchCat = !this.selectedCategories.length || this.selectedCategories.includes(p.categoriaNombre || '');
      const matchSub = !this.selectedSubcategories.length || this.selectedSubcategories.includes(p.subcategoriaNombre || '');

      const matchTexto = !termino || (
        p.nombreComercial?.toLowerCase().includes(termino) ||
        p.categoriaNombre?.toLowerCase().includes(termino) ||
        p.subcategoriaNombre?.toLowerCase().includes(termino) ||
        p.caracteristicas?.some(c => c.toLowerCase().includes(termino))
      );

      return matchFeat && matchCat && matchSub && matchTexto;
    });
  }

  get totalPaginas(): number {
    return Math.ceil(this.filteredProducts.length / this.productosPorPagina);
  }

  get productosPaginados(): ProductoCatalogo[] {
    const inicio = (this.paginaActual - 1) * this.productosPorPagina;
    return this.filteredProducts.slice(inicio, inicio + this.productosPorPagina);
  }

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPaginas) {
      this.paginaActual = nuevaPagina;
    }
  }

  toggleDetalles(id: string): void {
    this.detalleAbierto[id] = !this.detalleAbierto[id];
  }

  validarYAgregar(p: ProductoCatalogo): void {
  const valor = this.cantidades[p.id];
  const qty = Number(valor);

  const invalido =
    valor === '' ||
    isNaN(qty) ||
    qty <= 0 ||
    (!p.fraccionable && !Number.isInteger(qty)); // 👈 solo enteros si no es fraccionable

  this.erroresCantidad[p.id] = invalido;
  if (invalido) return;

  this.carritoSrv.agregarProducto({
    id: p.id,
    codProductoCatalogo: p.id,
    nombre: p.nombreComercial,
    pvp: p.pvp,
    cantidad: qty,
    unidadDeVenta: p.unidadDeVenta
  }, this.catalogoId);

  this.cantidades[p.id] = '';
  this.erroresCantidad[p.id] = false;
}

eliminarProductoDelCatalogo(productoCatalogoId: string): void {
  if (!confirm('¿Estás seguro de que deseas quitar este producto del catálogo?')) return;

  this.productoCatalogoSrv.eliminarProductoDelCatalogo(this.catalogoId, productoCatalogoId)
    .subscribe({
      next: () => {
        this.productos = this.productos.filter(p => p.id !== productoCatalogoId);
        alert('✅ Producto eliminado del catálogo');
      },
      error: err => {
        console.error('❌ Error al eliminar producto del catálogo:', err);
        alert('No se pudo eliminar el producto.');
      }
    });
}


  getIconoCaracteristica(c: string): string | null {
    const key = c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const map: { [key: string]: string } = {
      comerciojusto: 'fa-handshake',
      ecologico: 'fa-seedling',
      singluten: 'fa-bread-slice',
      singlutentrazas: 'fa-triangle-exclamation',
      sinlactosa: 'fa-wine-bottle',
      vegano: 'fa-leaf',
      vegetariano: 'fa-carrot'
    };
    if (!map[key]) console.warn('🟡 Característica sin icono:', c, '->', key);
    return map[key] || null;
  }
}
