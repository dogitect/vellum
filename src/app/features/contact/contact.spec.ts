// Copyright 2025 Leon Xia. MIT License.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ContactComponent } from './contact';

describe('ContactComponent', () => {
  let component: ContactComponent;
  let fixture: ComponentFixture<ContactComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const heading = compiled.querySelector('.contact__heading');
    expect(heading?.textContent).toContain("Let's Talk");
  });

  it('should display contact form', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const form = compiled.querySelector('.contact__form');
    expect(form).toBeTruthy();
  });

  it('should have all required form fields', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#fullName')).toBeTruthy();
    expect(compiled.querySelector('#email')).toBeTruthy();
    expect(compiled.querySelector('#projectInfo')).toBeTruthy();
  });

  it('should have submit button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const submitBtn = compiled.querySelector('.contact__submit');
    expect(submitBtn).toBeTruthy();
    expect(submitBtn?.textContent?.trim()).toBe('Send a message');
  });

  it('should initialize form as invalid', () => {
    expect(component['contactForm'].valid).toBe(false);
  });
});
