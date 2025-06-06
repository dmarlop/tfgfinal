import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MsalService } from '@azure/msal-angular';
import { PopupRequest } from '@azure/msal-browser';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, map, Observable, of, tap } from 'rxjs';
import { CarritoService } from './carrito.service';
import { HttpClient } from '@angular/common/http';
import { Cliente } from '../models/cliente.model';
import { environment } from '../../environments/environment.prod';


@Injectable({ providedIn: 'root' })
export class AuthService {
  private loginEvent = new BehaviorSubject<boolean>(false);
  loginEvent$ = this.loginEvent.asObservable();
  private _usuarioActual: Cliente | null = null;

  constructor(
    private msal: MsalService,
    private router: Router,
    private carritoSrv: CarritoService,
    @Inject(PLATFORM_ID) private platformId: object,
    private http: HttpClient
  ) {
    this.updateAuthState();
  }

  isLogged(): boolean {
    const loggedIn = this.msal.instance.getAllAccounts().length > 0;
    return loggedIn;
  }

  loadUsuarioDesdeBackend(): Observable<Cliente> {
    const sub = this.getUserSub();
    if (!sub) {
      console.warn('❌ No hay sub disponible en getUserSub');
      return of(null as any);
    }

    return this.http.get<Cliente>(`${environment.apiClienteUrl}/cliente/${sub}`).pipe(
      tap(usuario => {
        this._usuarioActual = usuario;
        sessionStorage.setItem('usuario', JSON.stringify(usuario));
      }),
      catchError(err => {
        console.error('❌ Error al cargar usuario desde backend', err);
        return of(null as any);
      })
    );
  }

  getUsuarioActual(): Cliente | null {
    if (this._usuarioActual) return this._usuarioActual;

    const usuarioGuardado = sessionStorage.getItem('usuario');
    if (usuarioGuardado) {
      this._usuarioActual = JSON.parse(usuarioGuardado);
      return this._usuarioActual;
    }

    return null;
  }

  loginIfNeeded(): void {
    console.log('🟢 loginIfNeeded() ejecutado');

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.isLogged()) {
      this.updateAuthState();
      return;
    }

    const req: PopupRequest = {
      scopes: ['openid', 'profile', 'User.Read'],
      prompt: 'select_account'
    };

    console.log('📢 Iniciando MSAL loginPopup...');
    this.msal.loginPopup(req).subscribe({
      next: (resp) => {
        this.msal.instance.setActiveAccount(resp.account);
        this.updateAuthState(true);

        this.loadUsuarioDesdeBackend().subscribe({
          next: usuario => {
            console.log('✅ Usuario cargado desde backend:', usuario);
          },
          error: err => {
            console.error('❌ Error al cargar el usuario desde backend:', err);
          }
        });

        this.router.navigateByUrl(this.router.url);
      },
      error: (err) => {
        console.error('❌ loginPopup error', err);
        this.updateAuthState(false);
      }
    });
  }

  getUserSub(): string | null {
    const all = this.msal.instance.getAllAccounts();
    console.log('MSAL all accounts:', all);
    let account = this.msal.instance.getActiveAccount() || all[0];
    console.log('MSAL activeAccount:', account);

    if (!account) {
      console.warn('AuthService.getUserSub: no hay cuenta MSAL');
      return null;
    }

    this.msal.instance.setActiveAccount(account);
    const claims = account.idTokenClaims as Record<string, any>;
    const oid = claims['oid'] as string | undefined;
    const sub = claims['sub'] as string | undefined;
    console.log('MSAL claims oid, sub:', oid, sub);

    return oid || sub || null;
  }

  logout(): void {
    console.log('🚪 Logout iniciado');
    const account = this.msal.instance.getActiveAccount();

    this.msal.logoutPopup({
      account,
      postLogoutRedirectUri: '/',
      mainWindowRedirectUri: '/'
    }).subscribe({
      next: () => {
        this.msal.instance.setActiveAccount(null);
        this.carritoSrv.limpiarCarrito();
        this.updateAuthState(false);
        sessionStorage.clear();
      },
      error: (err) => {
        this.updateAuthState(false);
      }
    });
  }

  esAdminDesdeBackend(): Observable<boolean> {
    const sub = this.getUserSub();
    if (!sub) return of(false);

    return this.http.get<any>(`${environment.apiClienteUrl}/usuarios/${sub}`).pipe(
      map(usuario => usuario.rol === 'administrador'),
      catchError(err => {
        console.error('❌ Error al comprobar rol admin:', err);
        return of(false);
      })
    );
  }

  loginConCredenciales(username: string, password: string): Observable<any> {
    const url = `${environment.apiClienteUrl}/auth/login`;
    return this.http.post(url, { username, password }).pipe(
      tap((res: any) => {
        console.log('🎉 Login con credenciales exitoso', res);
        sessionStorage.setItem('token', res.token);
        this.loginEvent.next(true);
      }),
      catchError(err => {
        console.error('❌ Error en login tradicional:', err);
        throw err;
      })
    );
  }

  private updateAuthState(forceValue?: boolean): void {
    const newState = forceValue !== undefined ? forceValue : this.isLogged();
    this.loginEvent.next(newState);
    console.log('🔁 Estado de autenticación actualizado:', newState);
  }
}
