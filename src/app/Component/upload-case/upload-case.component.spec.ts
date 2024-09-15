import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadCaseComponent } from './upload-case.component';

describe('UploadCaseComponent', () => {
  let component: UploadCaseComponent;
  let fixture: ComponentFixture<UploadCaseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadCaseComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UploadCaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
