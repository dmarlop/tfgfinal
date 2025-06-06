import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { switchMap, map, tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment.prod';
import { Pedido, LineaPedido, PedidoCompletoCreateDto } from '../models/pedido.model';

@Injectable({ providedIn: 'root' })
export class PedidoService {
  private cartLinesSubject = new BehaviorSubject<LineaPedido[]>([]);
  cartLines$ = this.cartLinesSubject.asObservable();

  private api = `${environment.apiCatalogoUrl}/pedidos`;
  private pedidoActualSubject = new BehaviorSubject<Pedido | null>(null);
  pedidoActual$ = this.pedidoActualSubject.asObservable();

  constructor(private http: HttpClient, private auth: AuthService) {}

  private getUserId(): string {
    return this.auth.getUserSub()!;
  }

  finalizarPedido(pedido: PedidoCompletoCreateDto): Observable<any> {
    console.log('📦 Enviando pedido al backend:', pedido);
    return this.http.post(`${this.api}`, pedido);
  }

  getPedidosPendientes(estado: string): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.api}/estado/Abierto`);
  }

  actualizarPedido(pedidoId: string, dto: any): Observable<any> {
    return this.http.put(`${this.api}/${pedidoId}`, dto);
  }

  actualizarCantidadEntregada(lineaId: string, nuevaCantidad: number): Observable<any> {
    const url = `${environment.apiCatalogoUrl}/lineas-pedido/entregada/${lineaId}`;
    return this.http.put(url, nuevaCantidad);
  }

  actualizarCantidadDeLinea(pedidoId: string, codProductoCatalogo: string, nuevaCantidad: number): Observable<any> {
    return this.http.put(
      `${this.api}/${pedidoId}/producto/${codProductoCatalogo}/cantidad`,
      { cantidadPedida: nuevaCantidad }
    );
  }

  getPedidosPorCatalogo(catalogo: string): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.api}/catalogo/${catalogo}`);
  }

  getPedidosPorEstados(estados: string[]): Observable<Pedido[]> {
    const estadosParam = estados.join(',');
    return this.http.get<Pedido[]>(`${this.api}/filtrar?estados=${estadosParam}`);
  }

  actualizarEstadoPedido(pedidoId: string, nuevoEstado: string): Observable<any> {
    return this.http.put(`${this.api}/${pedidoId}/estado`, { nuevoEstado }, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  getPedidoPorId(pedidoId: string): Observable<Pedido> {
    return this.http.get<Pedido>(`${this.api}/${pedidoId}`);
  }

  getPedidosPorUsuario(sub: string): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.api}/usuario/${sub}`);
  }

  tramitarPedido(pedidoId: string, cambios: { productoCatalogoId: string, nuevaCantidad: number }[]): Observable<void> {
    return this.http.put<void>(
      `${this.api}/${pedidoId}/productos/cantidad`,
      cambios
    );
  }
}
