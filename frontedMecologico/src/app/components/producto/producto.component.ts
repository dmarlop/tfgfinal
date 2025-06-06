import { Component, OnInit } from '@angular/core';
import { ProductoDto } from '../../models/producto.dto';
import { ProductoService } from '../../services/producto.service';
import { CategoriaDto, CategoriaService, SubcategoriaDto } from '../../services/categoria.service';
import { SubcategoriaService } from '../../services/subcategoria.service';
import { AuthService } from '../../services/auth.service';
import { ProductoCreateDto } from '../../models/producto-create.dto';
import { CategoriaCreateDto } from '../../models/categoria-create.dto';
import { SubcategoriaCreateDto } from '../../models/subcategoria-create.dto';
import { ProductoCatalogoService } from '../../services/producto-catalogo.service';
import { CatalogoService } from '../../services/catalogo.service';

@Component({
  selector: 'app-producto',
  standalone: false,
  templateUrl: './producto.component.html',
  styleUrls: ['./producto.component.css']
})
export class ProductoComponent implements OnInit {
  productos: ProductoDto[] = [];
  loading = true;
  paginaActual: number = 1;
  productosPorPagina: number = 10;
  modoEdicionPorProducto: { [id: string]: boolean } = {};
  mostrarFormularioCatalogoPorProducto: { [productoId: string]: boolean } = {};

  productoEditando: { [id: string]: ProductoDto } = {};
  subcategoriasPorProducto: { [productoId: string]: SubcategoriaDto[] } = {};
  catalogos: { id: string, nombre: string }[] = [];
  nombresCategoria: { [id: string]: string } = {};
  nombresSubcategoria: { [id: string]: string } = {};
  categorias: CategoriaDto[] = [];
  subcategorias: SubcategoriaDto[] = [];
  esAdmin = false;
  mostrarFormularioCrear = false;
  caracteristicasDisponibles: string[] = [
    'Ecológico',
    'Vegano',
    'Vegetariano',
    'SinGluten',
    'SinGlutenTrazas',
    'SinLactosa',
    'ComercioJusto'
  ];

  
  formularioCatalogoPorProducto: {
  [productoId: string]: {
    catalogoId: string;
    nombreComercial: string;
    coste: number;
    pvp: number;
    iva: number;
  };
} = {};
  productoNuevo: ProductoCreateDto = this.inicializarProducto();

  // NUEVO: estados y modelos para formularios de categoría y subcategoría
  mostrarFormularioCategoria = false;
  mostrarFormularioSubcategoria = false;

  nuevaCategoria: CategoriaCreateDto = {
    codCategoria: '',
    nombre: '',
    orden: 0
  };

  nuevaSubcategoria: SubcategoriaCreateDto = {
    categoriaId: '',
    codCategoria: '',
    nombre: '',
    orden: 0
  };

  constructor(
    private productoSrv: ProductoService,
    private categoriaSrv: CategoriaService,
    private subcategoriaSrv: SubcategoriaService,
    private auth: AuthService,
    private productoCatalogoSrv: ProductoCatalogoService,
    private catalogoSrv: CatalogoService
  ) {}

  ngOnInit(): void {
    this.auth.esAdminDesdeBackend().subscribe({
      next: (admin) => {
        this.esAdmin = admin;
        this.cargarProductos();
        this.cargarCategorias();
        this.cargarCatalogos();
      },
      error: err => {
        console.error('❌ Error comprobando si es admin:', err);
        this.cargarProductos();
      }
    });
  }
abrirFormularioCatalogo(productoId: string): void {
  this.mostrarFormularioCatalogoPorProducto[productoId] = true;

  if (!this.formularioCatalogoPorProducto[productoId]) {
    this.formularioCatalogoPorProducto[productoId] = {
      catalogoId: '',
      nombreComercial: '',
      coste: 0,
      pvp: 0,
      iva: 0
    };
  }
}

  cargarCatalogos(): void {
  this.catalogoSrv.getCatalogos().subscribe({
    next: (res) => {
      this.catalogos = res;
      console.log('✅ Catálogos cargados:', res); // Comprueba que se vean en consola
    },
    error: (err) => {
      console.error('❌ Error al cargar catálogos:', err);
    }
  });
}

  cargarProductos(): void {
    this.loading = true;
    this.productoSrv.findAll().subscribe({
      next: productos => {
        this.productos = productos;

        productos.forEach(p => {
          if (p.categoriaId) {
            this.categoriaSrv.getNombreCategoria(p.categoriaId).subscribe({
              next: (nombre: string) => {
                this.nombresCategoria[p.categoriaId] = nombre;
              },
              error: err => {
                console.error(`Error al cargar categoría ${p.categoriaId}:`, err);
              }
            });
          }

          if (p.categoriaId && p.subcategoriaId) {
            this.subcategoriaSrv.getNombreSubcategoria(p.categoriaId, p.subcategoriaId).subscribe({
              next: (nombre: string) => {
                this.nombresSubcategoria[p.subcategoriaId] = nombre;
              },
              error: err => {
                console.error(`Error al cargar subcategoría ${p.subcategoriaId}:`, err);
              }
            });
          }
        });

        this.loading = false;
      },
      error: err => {
        console.error('❌ Error al cargar productos:', err);
        this.loading = false;
      }
    });
  }

  get productosPaginados(): ProductoDto[] {
    const inicio = (this.paginaActual - 1) * this.productosPorPagina;
    const fin = inicio + this.productosPorPagina;
    return this.productos.slice(inicio, fin);
  }

  get totalPaginas(): number {
    return Math.ceil(this.productos.length / this.productosPorPagina);
  }

  toggleCaracteristica(nombre: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const index = this.productoNuevo.caracteristicas.indexOf(nombre);
    if (checked && index === -1) {
      this.productoNuevo.caracteristicas.push(nombre);
    } else if (!checked && index !== -1) {
      this.productoNuevo.caracteristicas.splice(index, 1);
    }
  }

  activarEdicion(producto: ProductoDto): void {
    this.modoEdicionPorProducto[producto.id] = true;
    this.productoEditando[producto.id] = { ...producto };
    this.onCategoriaSeleccionada(producto.categoriaId);
  }

  cancelarEdicion(id: string): void {
    this.modoEdicionPorProducto[id] = false;
    delete this.productoEditando[id];
  }

  eliminarProducto(id: string): void {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) return;

    this.productoSrv.eliminar(id).subscribe({
      next: () => {
        this.productos = this.productos.filter(p => p.id !== id);
      },
      error: err => {
        console.error('❌ Error eliminando producto:', err);
        alert('Hubo un error al eliminar el producto.');
      }
    });
  }
  asociarProductoACatalogo(productoId: string): void {
  const form = this.formularioCatalogoPorProducto[productoId];
  const dto = {
    productoId,
    nombreComercial: form.nombreComercial,
    coste: form.coste,
    pvp: form.pvp,
    iva: form.iva
  };

  this.productoCatalogoSrv.agregarProductoACatalogo(form.catalogoId, dto).subscribe({
    next: () => {
      alert('✅ Producto asociado al catálogo correctamente');
      this.mostrarFormularioCatalogoPorProducto[productoId] = false;
    },
    error: err => {
      console.error('❌ Error al asociar producto al catálogo:', err);
    }
  });
}


  toggleCaracteristicaEditar(productoId: string, nombre: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const caracteristicas = this.productoEditando[productoId].caracteristicas;
    const index = caracteristicas.indexOf(nombre);

    if (checked && index === -1) {
      caracteristicas.push(nombre);
    } else if (!checked && index !== -1) {
      caracteristicas.splice(index, 1);
    }
  }

  guardarEdicion(id: string): void {
    const editando = this.productoEditando[id];
    const dto: ProductoCreateDto = {
      codProducto: editando.codProducto,
      nombre: editando.nombre,
      nombreComercial: editando.nombreComercial,
      unidadDeVenta: editando.unidadDeVenta,
      variedad: editando.variedad,
      codigoBarras: editando.codigoBarras,
      categoriaId: editando.categoriaId,
      subcategoriaId: editando.subcategoriaId,
      caracteristicas: editando.caracteristicas ?? [],
      ingredientes: editando.ingredientes ?? [],
      imagenes: editando.imagenes ?? [],
      fraccionable: editando.fraccionable
    };

    this.productoSrv.actualizar(id, dto).subscribe({
      next: actualizado => {
        const idx = this.productos.findIndex(p => p.id === id);
        if (idx !== -1) this.productos[idx] = actualizado;
        this.cancelarEdicion(id);
      },
      error: err => console.error('❌ Error actualizando producto:', err)
    });
  }

  inicializarProducto(): ProductoCreateDto {
    return {
      codProducto: '',
      nombre: '',
      nombreComercial: '',
      unidadDeVenta: '',
      variedad: '',
      codigoBarras: '',
      categoriaId: '',
      subcategoriaId: '',
      caracteristicas: [],
      ingredientes: [],
      imagenes: [],
      fraccionable: true
    };
  }

  actualizarCaracteristicas(valor: string): void {
    this.productoNuevo.caracteristicas = valor.split(',').map(c => c.trim());
  }

  actualizarIngredientes(valor: string): void {
    this.productoNuevo.ingredientes = valor.split(',').map(i => i.trim());
  }

  actualizarImagenes(valor: string): void {
    this.productoNuevo.imagenes = valor.split(',').map(i => i.trim());
  }

  cargarCategorias(): void {
    this.categoriaSrv.getCategorias().subscribe({
      next: res => this.categorias = res,
      error: err => console.error('❌ Error cargando categorías:', err)
    });
  }

  onCategoriaSeleccionada(categoriaId: string): void {
    this.productoNuevo.categoriaId = categoriaId;
    this.productoNuevo.subcategoriaId = '';
    this.subcategorias = [];

    if (categoriaId) {
      this.categoriaSrv.getSubcategorias(categoriaId).subscribe({
        next: subs => this.subcategorias = subs,
        error: err => console.error('❌ Error cargando subcategorías:', err)
      });
    }
  }

  onCategoriaSeleccionadaDesdeEvento(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const categoriaId = selectElement.value;
    this.onCategoriaSeleccionada(categoriaId);
  }

  crearProducto(): void {
    this.productoSrv.crear(this.productoNuevo).subscribe({
      next: creado => {
        this.productos.push(creado);
        this.mostrarFormularioCrear = false;
        this.productoNuevo = this.inicializarProducto();
      },
      error: err => {
        console.error('❌ Error al crear producto:', err);
      }
    });
  }

  // NUEVO: crear categoría
  crearCategoria(): void {
    this.categoriaSrv.crear(this.nuevaCategoria).subscribe({
      next: () => {
        alert('✅ Categoría creada correctamente');
        this.cargarCategorias();
        this.nuevaCategoria = { codCategoria: '', nombre: '', orden: 0 };
        this.mostrarFormularioCategoria = false;
      },
      error: err => {
        console.error('❌ Error al crear categoría:', err);
      }
    });
  }

  // NUEVO: crear subcategoría
  crearSubcategoria(): void {
    const catId = this.nuevaSubcategoria.categoriaId;
    this.categoriaSrv.crearSubcategoria(catId, this.nuevaSubcategoria).subscribe({
      next: () => {
        alert('✅ Subcategoría creada correctamente');
        this.nuevaSubcategoria = { categoriaId: '', codCategoria: '', nombre: '', orden: 0 };
        this.mostrarFormularioSubcategoria = false;
      },
      error: err => {
        console.error('❌ Error al crear subcategoría:', err);
      }
    });
  }
}
