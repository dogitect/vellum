// Copyright 2025 Leon Xia. MIT License.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { HeroBackgroundComponent } from './hero-background';

describe('HeroBackgroundComponent', () => {
  let component: HeroBackgroundComponent;
  let fixture: ComponentFixture<HeroBackgroundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeroBackgroundComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HeroBackgroundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have background image', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const image = compiled.querySelector('.hero-background__image');
    expect(image).toBeTruthy();
  });

  it('should display slogan', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const slogan = compiled.querySelector('.hero-background__slogan-text');
    expect(slogan?.textContent).toBe('BEHIND YOU');
  });
});
