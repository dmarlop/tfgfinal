import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Cliente } from '../models/cliente.model';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class ClienteService {

  private apiUrl = `${environment.apiClienteUrl}/usuarios`;

  constructor(private http: HttpClient) {}

  getCliente(sub: string): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.apiUrl}/${sub}`);
  }

  getDirecciones(sub: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${sub}/direccion`);
  }

  crearDireccion(sub: string, direccion: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${sub}/direccion`, direccion);
  }
}
