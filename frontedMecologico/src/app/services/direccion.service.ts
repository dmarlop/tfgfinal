import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.prod';
import { DireccionCreateDto } from '../models/direccion-create.dto';
import { Direccion } from '../models/cliente.model';

@Injectable({ providedIn: 'root' })
export class DireccionService {

  private apiUrl = `${environment.apiClienteUrl}/usuarios`;

  constructor(private http: HttpClient) {}

  getDirecciones(usuarioSub: string): Observable<Direccion[]> {
    return this.http.get<Direccion[]>(`${this.apiUrl}/${usuarioSub}/direccion`);
  }

  marcarDireccionComoActual(sub: string, direccionId: number): Observable<void> {
    const url = `${this.apiUrl}/${sub}/direccion/${direccionId}/actual`;
    return this.http.put<void>(url, null);
  }

  crearDireccion(sub: string, direccion: DireccionCreateDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/${sub}/direccion`, direccion);
  }
}
