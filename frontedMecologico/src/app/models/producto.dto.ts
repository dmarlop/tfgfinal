export interface ProductoDto {
  id: string;
  codProducto: string;
  unidadDeVenta: string;
  nombre: string;
  nombreComercial: string;
  variedad: string;
  codigoBarras: string;
  categoriaId: string;
  subcategoriaId: string;
  caracteristicas: string[];
  ingredientes: string[];
  imagenes: string[];
  fraccionable: boolean;
}
