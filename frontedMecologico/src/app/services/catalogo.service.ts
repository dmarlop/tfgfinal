import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.prod';
import { CatalogoCreateDto } from '../models/catalogo-create.dto';

export interface Catalogo {
  id: string;
  nombre: string;
  status: 'Previo' | 'Activo' | 'Cerrado';
  fecha: string;
  startTime?: string;
  modifyTime?: string;
}

export interface CategoriaMini {
  id: string;
  nombre: string;
}

export interface ProductoCatalogo {
  id: string;
  productoId: string;
  nombreComercial: string;
  unidadDeVenta: string;
  pvp: number;
  iva: number;
  imagenes: string[];
  categoriaNombre?: string;
  subcategoriaNombre?: string;
  caracteristicas?: string[];
  ingredientes?: boolean;
  ingredientesLista?: string[];
  categoriaId?: string;
  subcategoriaId?: string;
  fraccionable?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CatalogoService {

  private api = `${environment.apiCatalogoUrl}/catalogos`;

  constructor(private http: HttpClient) {}

  getCatalogos(): Observable<Catalogo[]> {
    return this.http.get<Catalogo[]>(this.api);
  }

  deleteCatalogo(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  getProducto(catalogoId: string, productoCatalogoId: string): Observable<ProductoCatalogo> {
    return this.http.get<ProductoCatalogo>(`${this.api}/${catalogoId}/productos/${productoCatalogoId}`);
  }

  crearCatalogo(dto: CatalogoCreateDto): Observable<any> {
    return this.http.post(this.api, dto);
  }

  getProductos(catId: string): Observable<ProductoCatalogo[]> {
    return this.http.get<ProductoCatalogo[]>(`${this.api}/${catId}/productos`);
  }

  getCatalogo(catId: string): Observable<Catalogo> {
    return this.http.get<Catalogo>(`${this.api}/${catId}`);
  }

  actualizarCatalogo(id: string, dto: CatalogoCreateDto): Observable<Catalogo> {
    return this.http.put<Catalogo>(`${this.api}/${id}`, dto);
  }
}
