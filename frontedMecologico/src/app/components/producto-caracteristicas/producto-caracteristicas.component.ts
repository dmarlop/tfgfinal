import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-producto-caracteristicas',
  standalone: false,
  templateUrl: './producto-caracteristicas.component.html',
  styleUrls: ['./producto-caracteristicas.component.css']
})
export class ProductoCaracteristicasComponent {
  @Input() caracteristicas: string[] = [];

  iconMap: { [key: string]: string } = {
    'comerciojusto': 'fa-handshake',
    'ecológico': 'fa-seedling',
    'singluten': 'fa-wheat-slash',
    'singlutentrazas': 'fa-wheat-slash',
    'sinlactosa': 'fa-ban',
    'vegano': 'fa-leaf',
    'vegetariano': 'fa-carrot',
  };

  normalizar(c: string): string {
    return c.toLowerCase().replace(/\s/g, '');
  }

  get iconos(): { clase: string; titulo: string }[] {
    return (this.caracteristicas || [])
      .map(c => ({
        clase: this.iconMap[this.normalizar(c)],
        titulo: c
      }))
      .filter(icono => icono.clase); // solo iconos válidos
  }
}
