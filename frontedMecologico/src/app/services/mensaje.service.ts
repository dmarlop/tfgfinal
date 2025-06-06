import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MensajeService {
  private mensajeSubject = new BehaviorSubject<{ texto: string, tipo: 'success' | 'danger' | 'warning' | null } | null>(null);
  mensaje$ = this.mensajeSubject.asObservable();

  mostrar(mensaje: string, tipo: 'success' | 'danger' | 'warning' = 'success') {
    this.mensajeSubject.next({ texto: mensaje, tipo });

    setTimeout(() => {
      this.mensajeSubject.next(null);
    }, 3000);
  }
}
