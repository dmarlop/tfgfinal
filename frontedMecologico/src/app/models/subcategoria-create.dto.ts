export interface SubcategoriaCreateDto {
  categoriaId: string;      // ID de la categoría padre
  codCategoria: string;
  nombre: string;
  orden: number;
}
