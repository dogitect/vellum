// Copyright 2025 Leon Xia. MIT License.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OptimizedImageComponent } from './optimized-image.component';

describe('OptimizedImageComponent', () => {
  let component: OptimizedImageComponent;
  let fixture: ComponentFixture<OptimizedImageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OptimizedImageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OptimizedImageComponent);
    component = fixture.componentInstance;

    const componentRef = fixture.componentRef;
    componentRef.setInput('src', 'images/works/covers/boardroom.jpg');

    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render <img> with local src in dev mode', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const img = compiled.querySelector('img');
    const sources = compiled.querySelectorAll('source');

    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe('images/works/covers/boardroom.jpg');
    expect(sources.length).toBe(0);
  });

  it('should pass through alt text', () => {
    fixture.componentRef.setInput('alt', 'A boardroom interior');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const img = compiled.querySelector('img');

    expect(img?.getAttribute('alt')).toBe('A boardroom interior');
  });

  it('should default loading to lazy', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const img = compiled.querySelector('img') as HTMLImageElement;

    expect(img?.loading).toBe('lazy');
  });

  it('should default fetchpriority to auto (attribute absent)', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const img = compiled.querySelector('img');

    expect(img?.getAttribute('fetchpriority')).toBeNull();
  });
});
