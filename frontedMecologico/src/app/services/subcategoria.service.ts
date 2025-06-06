import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class SubcategoriaService {
  private readonly baseUrl = `${environment.apiProductoUrl}/categorias`;

  constructor(private http: HttpClient) {}

  getNombreSubcategoria(catId: string, subId: string): Observable<string> {
    return this.http
      .get<{ nombre: string }>(`${this.baseUrl}/${catId}/subcategorias/${subId}`)
      .pipe(map(res => res.nombre));
  }
}
