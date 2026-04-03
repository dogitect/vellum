// Copyright 2025 Leon Xia. MIT License.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { NotFoundComponent } from './not-found';

describe('NotFoundComponent', () => {
  let component: NotFoundComponent;
  let fixture: ComponentFixture<NotFoundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NotFoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display 404 error code', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const code = compiled.querySelector('.not-found__code');
    expect(code?.textContent).toContain('404');
  });

  it('should display heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const heading = compiled.querySelector('.not-found__heading');
    expect(heading?.textContent).toContain('Page Not Found');
  });

  it('should have proper error code signal value', () => {
    expect(component['errorCode']()).toBe('404');
  });

  it('should have proper heading signal value', () => {
    expect(component['heading']()).toBe('Page Not Found');
  });
});
