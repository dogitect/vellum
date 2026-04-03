// Copyright 2025 Leon Xia. MIT License.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { FooterComponent } from './footer';
import { BreakpointService } from '../../core/services';
import { signal } from '@angular/core';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;
  let mockBreakpointService: Partial<BreakpointService>;

  beforeEach(async () => {
    mockBreakpointService = {
      isPhone: signal(false),
      isTablet: signal(false),
      isDesktop: signal(true),
      isMobile: signal(false),
    };

    await TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [
        { provide: BreakpointService, useValue: mockBreakpointService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display copyright', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const copyright = compiled.querySelector('.footer__copyright');
    expect(copyright?.textContent).toContain('2026');
    expect(copyright?.textContent).toContain('Vellum by Dogitect');
  });
});
