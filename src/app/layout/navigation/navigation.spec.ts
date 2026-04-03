// Copyright 2025 Leon Xia. MIT License.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { describe, it, expect, beforeEach } from 'vitest';
import { NavigationComponent } from './navigation';
import { BreakpointService } from '../../core/services';
import { signal } from '@angular/core';

describe('NavigationComponent', () => {
  let component: NavigationComponent;
  let fixture: ComponentFixture<NavigationComponent>;
  let mockBreakpointService: Partial<BreakpointService>;

  beforeEach(async () => {
    mockBreakpointService = {
      isPhone: signal(false),
      isTablet: signal(false),
      isDesktop: signal(true),
      isMobile: signal(false),
    };

    await TestBed.configureTestingModule({
      imports: [NavigationComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: BreakpointService, useValue: mockBreakpointService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NavigationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render navigation links on desktop', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const navLinks = compiled.querySelectorAll('.navigation__link');
    expect(navLinks.length).toBe(4);
  });

  it('should have correct navigation items', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const navLinks = compiled.querySelectorAll('.navigation__link');
    const labels = Array.from(navLinks).map((link) => link.textContent?.trim());

    expect(labels).toContain('Overview');
    expect(labels).toContain('Works');
    expect(labels).toContain('About');
    expect(labels).toContain('Contact');
  });
});
