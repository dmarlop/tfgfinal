export interface SubcategoriaDto {
  id: string;
  categoriaId: string;
  codCategoria: string;
  nombre: string;
  orden: number;
  createdAt: string;       // o Date si lo parseas
  updatedAt: string;       // o Date si lo parseas
}
