import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CategoriaCreateDto } from '../models/categoria-create.dto';
import { SubcategoriaCreateDto } from '../models/subcategoria-create.dto';
import { environment } from '../../environments/environment.prod';

export interface CategoriaDto {
  id: string;
  nombre: string;
  codCategoria: string;
}

export interface SubcategoriaDto {
  id: string;
  nombre: string;
  codCategoria: string;
  orden: number;
}

@Injectable({
  providedIn: 'root'
})
export class CategoriaService {
  private readonly baseUrl = `${environment.apiProductoUrl}/categorias`;

  constructor(private http: HttpClient) {}

  getNombreCategoria(id: string): Observable<string> {
    return this.http.get<{ nombre: string }>(`${this.baseUrl}/${id}`)
      .pipe(map(res => res.nombre));
  }

  getCategorias(): Observable<CategoriaDto[]> {
    return this.http.get<CategoriaDto[]>(`${this.baseUrl}`);
  }

  getSubcategorias(categoriaId: string): Observable<SubcategoriaDto[]> {
    return this.http.get<SubcategoriaDto[]>(`${this.baseUrl}/${categoriaId}/subcategorias`);
  }

  crear(categoria: CategoriaCreateDto): Observable<any> {
    return this.http.post(`${this.baseUrl}`, categoria);
  }

  crearSubcategoria(catId: string, subcat: SubcategoriaCreateDto): Observable<any> {
    return this.http.post(`${this.baseUrl}/${catId}/subcategorias`, subcat);
  }

  obtenerTodas(): Observable<CategoriaDto[]> {
    return this.http.get<CategoriaDto[]>(`${this.baseUrl}`);
  }
}
