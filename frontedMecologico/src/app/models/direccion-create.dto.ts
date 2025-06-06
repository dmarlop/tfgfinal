
export interface DireccionCreateDto {
  direccion: string;
  codigoPostal?: string;
  municipio?: string;
  provincia?: string;
  esDefault: boolean;
}
