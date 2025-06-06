import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { Cliente, Direccion } from '../../models/cliente.model';
import { ClienteService } from '../../services/cliente.service';
import { AuthService } from '../../services/auth.service';
import { isPlatformBrowser } from '@angular/common';
import { DireccionService } from '../../services/direccion.service';
import { DireccionCreateDto } from '../../models/direccion-create.dto';

@Component({
  selector: 'app-cliente',
  standalone: false,
  templateUrl: './cliente.component.html',
  styleUrls: ['./cliente.component.css']
})
export class ClienteComponent implements OnInit {
  cliente?: Cliente;
  formularioVisible = false;

  panelDireccionesVisible = false;
  direcciones: any[] = [];
  mensaje: string | null = null;
  tipoMensaje: 'success' | 'error' | null = null;
mostrarFormularioDireccion = false;
nuevaDireccion: DireccionCreateDto = {
  direccion: '',
  municipio: '',
  provincia: '',
  codigoPostal: '',
  esDefault: false
};

  constructor(
    private clienteService: ClienteService,
    private auth: AuthService,
    private direccionService: DireccionService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
  if (!isPlatformBrowser(this.platformId)) {
    return;
  }

  // 🔥 Eliminamos la lógica innecesaria de login, ya debería estar logueado
  if (!this.auth.isLogged()) {
    console.error('Intento de acceso sin sesión activa.');
    return;
  }

  // ✅ Obtener el usuario sub
  const sub = this.auth.getUserSub();
  console.log('Sub obtenido en ngOnInit:', sub);

  if (!sub) {
    console.error('No hay sub en el token, no puedo buscar el cliente.');
    return;
  }

  // ✅ Cargar los datos del cliente
  this.clienteService.getCliente(sub).subscribe({
    next: data => {
      this.cliente = data;
      console.log('Cliente recibido:', data);
    },
    error: err => console.error('Error al obtener el cliente:', err)
  });
}

crearNuevaDireccion(): void {
  const sub = this.auth.getUserSub();
  if (!sub) return;

  this.clienteService.crearDireccion(sub, this.nuevaDireccion).subscribe({
    next: () => {
      this.mensaje = 'Dirección añadida correctamente.';
      this.tipoMensaje = 'success';
      this.formularioVisible = false;
      this.nuevaDireccion = {
        direccion: '',
        municipio: '',
        provincia: '',
        codigoPostal: '',
        esDefault: false
      };
      this.clienteService.getDirecciones(sub).subscribe({
        next: dirs => this.direcciones = dirs,
        error: err => console.error('Error al recargar direcciones:', err)
      });
    },
    error: err => {
      this.mensaje = 'Error al crear la dirección.';
      this.tipoMensaje = 'error';
      console.error(err);
    }
  });

  setTimeout(() => this.mensaje = null, 3000);
}

  goToDirecciones(): void {
    // idem: sólo en browser
    if (!isPlatformBrowser(this.platformId)) return;

    this.panelDireccionesVisible = !this.panelDireccionesVisible;
    if (this.panelDireccionesVisible) {
      const sub = this.auth.getUserSub();
      console.log('Sub en goToDirecciones:', sub);
      if (!sub) return;
      this.clienteService.getDirecciones(sub).subscribe({
        next: dirs => {
          this.direcciones = dirs;
          console.log('Direcciones recibidas:', dirs);
        },
        error: err => console.error('Error al obtener direcciones:', err)
      });
    }
  }

marcarComoActual(dir: any): void {
  const sub = this.auth.getUserSub();
  if (!sub) return;

  this.direccionService.marcarDireccionComoActual(sub, dir.id).subscribe({
  next: () => {
    this.direccionService.getDirecciones(sub).subscribe({
      next: dirs => this.direcciones = dirs,
      error: err => console.error('Error al recargar direcciones:', err)
    });
  },
  error: err => console.error('Error al marcar dirección como actual:', err)
});
this.mensaje = 'Dirección marcada como actual correctamente.';
this.tipoMensaje = 'success';
setTimeout(() => this.mensaje = null, 3000);

}
}
