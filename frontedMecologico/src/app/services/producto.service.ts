import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ProductoDto } from '../models/producto.dto';
import { ProductoCreateDto } from '../models/producto-create.dto';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private readonly baseUrl = `${environment.apiProductoUrl}/productos`;

  constructor(private http: HttpClient) {}

  findAll(): Observable<ProductoDto[]> {
    return this.http.get<ProductoDto[]>(this.baseUrl);
  }

  getUno(id: string): Observable<ProductoDto> {
    return this.http.get<ProductoDto>(`${this.baseUrl}/${id}`);
  }

  crear(dto: ProductoCreateDto): Observable<ProductoDto> {
    return this.http.post<ProductoDto>(this.baseUrl, dto);
  }

  actualizar(id: string, dto: ProductoCreateDto): Observable<ProductoDto> {
    return this.http.put<ProductoDto>(`${this.baseUrl}/${id}`, dto);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
