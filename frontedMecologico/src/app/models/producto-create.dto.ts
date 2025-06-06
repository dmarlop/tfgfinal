export interface ProductoCreateDto {
  codProducto: string;
  nombre: string;
  nombreComercial: string;
  unidadDeVenta?: string;
  variedad?: string;
  codigoBarras?: string;
  categoriaId: string;
  subcategoriaId?: string;
  caracteristicas: string[];
  ingredientes: string[];
  imagenes: string[];
  fraccionable: boolean;
}
