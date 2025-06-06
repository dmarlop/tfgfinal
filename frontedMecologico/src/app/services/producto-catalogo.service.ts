import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { ProductoCatalogoCreateDto } from "../models/producto-catalogo-create.dto";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment.prod";

@Injectable({ providedIn: 'root' })
export class ProductoCatalogoService {
  private baseUrl = `${environment.apiCatalogoUrl}/catalogos`;

  constructor(private http: HttpClient) {}

  agregarProductoACatalogo(catalogoId: string, dto: ProductoCatalogoCreateDto): Observable<any> {
    const url = `${this.baseUrl}/${catalogoId}/productos`;
    return this.http.post(url, dto);
  }

  eliminarProductoDelCatalogo(catalogoId: string, productoCatalogoId: string): Observable<void> {
    const url = `${this.baseUrl}/${catalogoId}/productos/${productoCatalogoId}`;
    return this.http.delete<void>(url);
  }
}
