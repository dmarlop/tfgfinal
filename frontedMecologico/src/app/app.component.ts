import { Component, OnInit } from '@angular/core';
import { MsalBroadcastService } from '@azure/msal-angular';
import { EventMessage, EventType } from '@azure/msal-browser';
import { Router, NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: false 
})
export class AppComponent implements OnInit {
  mostrarCarrito = false;

  constructor(
    private msalBroadcast: MsalBroadcastService,
    public router: Router
  ) {}

  ngOnInit(): void {
    // Bloquear la redirección automática al cliente
    if (window.location.pathname === '/cliente') {
      console.warn('Redirección forzada a "/" para evitar salto a /cliente');
      this.router.navigate(['/']);
    }

    // Interceptar eventos de login de MSAL
    this.msalBroadcast.msalSubject$.subscribe((event: EventMessage) => {
      if (event.eventType === EventType.LOGIN_SUCCESS) {
        console.log('🎯 Login exitoso capturado por app.component.ts');
        this.router.navigate(['/']);
      }
    });

    
    // Detectar cambios de ruta y mostrar u ocultar el carrito
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        // Mostrar el carrito solo en rutas tipo /catalogos/ID
        const url = event.urlAfterRedirects;
        this.mostrarCarrito = /^\/catalogos\/[^/]+$/.test(url);
      }
    });
  }
  mostrarCarritoTrue(): boolean {
    // Devuelve true solo si la ruta empieza por "/catalogos/"
    return this.router.url.startsWith('/catalogos/');
  }
}
