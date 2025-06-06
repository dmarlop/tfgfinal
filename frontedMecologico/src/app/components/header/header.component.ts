import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  standalone: false
})
export class HeaderComponent implements OnInit {
  esAdministrador: boolean = false;
  constructor(public auth: AuthService, private router: Router) {}
  
  ngOnInit(): void {
    this.auth.esAdminDesdeBackend().subscribe(isAdmin => {
      this.esAdministrador = isAdmin;
    });
    this.auth.loginEvent$.subscribe(isLoggedIn => {
      if (isLoggedIn) {
        this.router.navigateByUrl('/cliente');
      }
    });
  }

  goCliente() {
    if (this.auth.isLogged()) {
  
      this.router.navigateByUrl('/cliente');
    } else {

      this.auth.loginIfNeeded();
    }
  }

  closeDropdown(ev: Event) {
    (ev.target as HTMLElement).closest('.dropdown')?.querySelector('.btn')
      ?.dispatchEvent(new Event('click'));
  }

  login(): void {
    this.auth.loginIfNeeded();
  }

  logout(): void {
    this.auth.logout();
  }
}
