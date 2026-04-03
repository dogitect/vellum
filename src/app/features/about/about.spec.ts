// Copyright 2025 Leon Xia. MIT License.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AboutComponent } from './about';

describe('AboutComponent', () => {
  let component: AboutComponent;
  let fixture: ComponentFixture<AboutComponent>;

  const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('1024.01px'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  beforeEach(async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });

    await TestBed.configureTestingModule({
      imports: [AboutComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AboutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial active index of 0', () => {
    expect(component['activeIndex']()).toBe(0);
  });

  it('should have golden ratio panel widths', () => {
    const leftWidth = component['leftPanelWidth']();
    const rightWidth = component['rightPanelWidth']();

    expect(leftWidth).toContain('%');
    expect(rightWidth).toContain('%');

    const leftPercent = parseFloat(leftWidth ?? '0');
    const rightPercent = parseFloat(rightWidth ?? '0');

    expect(leftPercent).toBeGreaterThan(35);
    expect(leftPercent).toBeLessThan(42);
    expect(rightPercent).toBeGreaterThan(58);
    expect(rightPercent).toBeLessThan(65);
  });

  it('should format display index with leading zero', () => {
    expect(component['displayIndex']()).toBe('01');
  });

  it('should render the about section', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const aboutSection = compiled.querySelector('.about');
    expect(aboutSection).toBeTruthy();
  });

  it('should render navigation', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const nav = compiled.querySelector('.about__nav');
    expect(nav).toBeTruthy();
  });

  it('should render the gallery container', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const gallery = compiled.querySelector('.about__gallery');
    expect(gallery).toBeTruthy();
  });
});
