import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductoCaracteristicasComponent } from './producto-caracteristicas.component';

describe('ProductoCaracteristicasComponent', () => {
  let component: ProductoCaracteristicasComponent;
  let fixture: ComponentFixture<ProductoCaracteristicasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProductoCaracteristicasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductoCaracteristicasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
